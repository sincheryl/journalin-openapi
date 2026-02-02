import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../../types";

export class RestoreItinerary extends OpenAPIRoute {
    public schema = {
        tags: ["Itinerary"],
        summary: "Restore a specific version",
        description: "Takes the content of a historical version and saves it as the latest version.",
        request: {
            body: contentJson(
                z.object({
                    itineraryId: z.string().openapi({ example: "trip_789" }),
                    versionNumber: z.number().openapi({ example: 1 }),
                }),
            ),
        },
        responses: {
            "200": {
                description: "Version restored successfully",
                ...contentJson({
                    success: z.boolean(),
                    newVersion: z.number(),
                    message: z.string(),
                }),
            },
            "404": {
                description: "Version not found",
                ...contentJson({
                    success: z.boolean(),
                    message: z.string(),
                }),
            },
        },
    };

    public async handle(c: AppContext) {
        const data = await this.getValidatedData<typeof this.schema>();
        const { itineraryId, versionNumber } = data.body;
        const env = c.env;

        try {
            // 1. 查找指定版本的内容
            const targetVersion = await env.DB.prepare(
                'SELECT content FROM itinerary_versions WHERE itinerary_id = ? AND version_number = ?'
            )
            .bind(itineraryId, versionNumber)
            .first<{ content: string }>();

            if (!targetVersion) {
                return Response.json(
                    { success: false, message: "Specified version not found." },
                    { status: 404 }
                );
            }

            // 2. 获取当前最大版本号以便递增
            const lastVersionResult = await env.DB.prepare(
                'SELECT MAX(version_number) as maxV FROM itinerary_versions WHERE itinerary_id = ?'
            )
            .bind(itineraryId)
            .first();

            const newVersion = ((lastVersionResult as any)?.maxV || 0) + 1;

            // 3. 将旧内容作为新版本插入
            const restoreSummary = `Restored from version ${versionNumber}`;
            await env.DB.prepare(
                'INSERT INTO itinerary_versions (itinerary_id, version_number, content, change_summary) VALUES (?, ?, ?, ?)'
            )
            .bind(itineraryId, newVersion, targetVersion.content, restoreSummary)
            .run();

            return {
                success: true,
                newVersion: newVersion,
                message: `Successfully restored version ${versionNumber} as the new version ${newVersion}.`,
            };
        } catch (error: any) {
            return Response.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }
    }
}