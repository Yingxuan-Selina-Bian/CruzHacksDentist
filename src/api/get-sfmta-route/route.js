async function handler({ startAddress, endAddress }) {
  try {
    const startResponse = await fetch(
      `/integrations/google-place-autocomplete/geocode/json?address=${encodeURIComponent(
        startAddress
      )}`
    );
    const endResponse = await fetch(
      `/integrations/google-place-autocomplete/geocode/json?address=${encodeURIComponent(
        endAddress
      )}`
    );

    if (!startResponse.ok || !endResponse.ok) {
      return { error: "Failed to geocode addresses" };
    }

    const startData = await startResponse.json();
    const endData = await endResponse.json();

    if (
      !startData.results?.[0]?.geometry?.location ||
      !endData.results?.[0]?.geometry?.location
    ) {
      return { error: "Invalid addresses provided" };
    }

    const startCoords = startData.results[0].geometry.location;
    const endCoords = endData.results[0].geometry.location;

    const routeResponse = await fetch(
      "/integrations/chat-gpt/conversationgpt4",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Given these coordinates:
            Start: ${startCoords.lat},${startCoords.lng}
            End: ${endCoords.lat},${endCoords.lng}
            
            Provide the best SFMTA transit route between these points. Include:
            1. Walking directions to nearest stop
            2. Which bus/train lines to take
            3. Transfer points if needed
            4. Walking directions from final stop
            
            Format as a step-by-step journey.`,
            },
          ],
          json_schema: {
            name: "transit_route",
            schema: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      instruction: { type: "string" },
                      details: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["type", "instruction", "details", "duration"],
                    additionalProperties: false,
                  },
                },
                totalDuration: { type: "string" },
                fare: { type: "string" },
              },
              required: ["steps", "totalDuration", "fare"],
              additionalProperties: false,
            },
          },
        }),
      }
    );

    if (!routeResponse.ok) {
      return { error: "Failed to generate transit route" };
    }

    const routeData = await routeResponse.json();

    await sql`
      INSERT INTO business_recommendations 
      (business_name, address, website_url, telephone, recommendation_reason)
      VALUES 
      (
        ${`Transit Route: ${startAddress} to ${endAddress}`},
        ${`From: ${startAddress} To: ${endAddress}`},
        ${null},
        ${null},
        ${JSON.stringify(routeData.choices[0].message.content)}
      )
    `;

    return {
      route: JSON.parse(routeData.choices[0].message.content),
      start: {
        address: startAddress,
        coordinates: startCoords,
      },
      end: {
        address: endAddress,
        coordinates: endCoords,
      },
    };
  } catch (error) {
    console.error("Error in getSFMTARoute:", error);
    return { error: "Failed to process transit route request" };
  }
}