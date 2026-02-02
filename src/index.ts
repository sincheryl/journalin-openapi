import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";
import { cors } from 'hono/cors';
import { SaveItinerary } from './endpoints/itineraries/save';
import { CompareItineraries } from './endpoints/itineraries/compare';
import { RestoreItinerary } from "./endpoints/itineraries/restore";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.onError((err, c) => {
	if (err instanceof ApiException) {
		// If it's a Chanfana ApiException, let Chanfana handle the response
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err); // Log the error if it's not known

	// For other errors, return a generic 500 response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
    docs_url: "/",
    schema: {
        info: {
            title: "Journalin Core Engine",
            version: "1.0.0",
            description: "A universal version control and snapshot management API for user-generated content.",
            contact: {
                name: "Journalin Dev Team",
            },
        },
    },
});

openapi.post('/itineraries/save', SaveItinerary);
openapi.get('/itineraries/compare', CompareItineraries);
openapi.post("/itineraries/restore", RestoreItinerary);

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);

// Export the Hono app
export default app;
