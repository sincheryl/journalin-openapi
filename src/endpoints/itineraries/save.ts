import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";

export class SaveItinerary extends OpenAPIRoute {
    public schema = {
        tags: ["Itinerary"],
        summary: "Save itinerary version snapshot",
        description: "Stores the current itinerary JSON data into the D1 database and increments the version number.",
        request: {
            body: contentJson(
                z.object({
                    itineraryId: z.string().openapi({ example: "trip_789" }),
                    content: z.record(z.any()).openapi({ 
                        example: { 
                            destination: "London", 
                            days: [{ day: 1, activities: ["Big Ben", "London Eye"] }] 
                        } 
                    }),
                    changeSummary: z.string().openapi({ example: "Updated Day 1 activities" }),
                }),
            ),
        },
        responses: {
            "200": {
                description: "Itinerary saved successfully",
                ...contentJson({
                    success: z.boolean(),
                    version: z.number(),
                    message: z.string(),
                }),
            },
        },
    };

    public async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const { itineraryId, content, changeSummary } = data.body;
        const env = c.env;

        try {
            await env.DB.prepare('INSERT OR IGNORE INTO itineraries (id) VALUES (?)')
                .bind(itineraryId)
                .run();

            const lastVersionResult = await env.DB.prepare(
                'SELECT MAX(version_number) as maxV FROM itinerary_versions WHERE itinerary_id = ?'
            )
            .bind(itineraryId)
            .first();

            const maxV = (lastVersionResult as any)?.maxV || 0;
            const newVersion = maxV + 1;

            await env.DB.prepare(
                'INSERT INTO itinerary_versions (itinerary_id, version_number, content, change_summary) VALUES (?, ?, ?, ?)'
            )
            .bind(itineraryId, newVersion, JSON.stringify(content), changeSummary)
            .run();

            return {
                success: true,
                version: newVersion,
                message: `Version ${newVersion} saved successfully.`,
            };
        } catch (error: any) {
            return Response.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }
    }
}