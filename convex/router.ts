import { httpRouter } from "convex/server";

const http = httpRouter();

// Add any custom HTTP routes here
// For example:
// http.route({
//   path: "/api/custom-endpoint",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {
//     // Handle custom API endpoint
//     return new Response("OK", { status: 200 });
//   }),
// });

export default http;
