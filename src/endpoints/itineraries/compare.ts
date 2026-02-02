import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";

export class CompareItineraries extends OpenAPIRoute {
    public schema = {
        tags: ["Itinerary"],
        summary: "Get itinerary version history",
        description: "Retrieves all saved versions of a specific itinerary for comparison or restoration.",
        request: {
            query: z.object({
                id: z.string().describe("The unique ID of the itinerary").openapi({ example: "trip_789" }),
            }),
        },
        responses: {
            "200": {
                description: "List of itinerary versions retrieved successfully",
                ...contentJson({
                    success: z.boolean(),
                    versions: z.array(
                        z.object({
                            version_number: z.number(),
                            content: z.record(z.any()),
                            change_summary: z.string(),
                            created_at: z.string(),
                        })
                    ),
                }),
            },
        },
    };

    public async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const itineraryId = data.query.id;
        const env = c.env;

        try {
            const { results } = await env.DB.prepare(
                'SELECT version_number, content, change_summary, created_at FROM itinerary_versions WHERE itinerary_id = ? ORDER BY version_number DESC'
            )
            .bind(itineraryId)
            .all();

            const formattedVersions = (results as any[]).map((row) => ({
                version_number: row.version_number,
                content: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
                change_summary: row.change_summary,
                created_at: row.created_at,
            }));

            return {
                success: true,
                versions: formattedVersions,
            };
        } catch (error: any) {
            return Response.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }
    }
}