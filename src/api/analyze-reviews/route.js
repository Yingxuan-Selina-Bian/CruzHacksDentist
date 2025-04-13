async function handler({ place_id }) {
  if (!place_id) {
    return { error: "Place ID is required" };
  }

  try {
    const placeResponse = await fetch(
      `/integrations/local-business-data/details?place_id=${place_id}&fields=reviews,name,rating`
    );
    if (!placeResponse.ok) {
      throw new Error("Failed to fetch place details");
    }
    const placeData = await placeResponse.json();

    if (!placeData.data?.reviews?.length) {
      return { error: "No reviews found for this location" };
    }

    const reviewsText = placeData.data.reviews
      .map((review) => `Review (${review.rating} stars): ${review.text}`)
      .join("\n\n");

    const geminiResponse = await fetch("/integrations/google-gemini-1-5/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Analyze these dental office reviews and provide insights. Focus on common themes, strengths, and areas for improvement:\n\n${reviewsText}`,
          },
        ],
        json_schema: {
          name: "review_analysis",
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              strengths: {
                type: "array",
                items: { type: "string" },
              },
              improvements: {
                type: "array",
                items: { type: "string" },
              },
              sentiment: {
                type: "string",
                enum: [
                  "Very Positive",
                  "Positive",
                  "Neutral",
                  "Negative",
                  "Very Negative",
                ],
              },
              recommendation: { type: "string" },
            },
            required: [
              "summary",
              "strengths",
              "improvements",
              "sentiment",
              "recommendation",
            ],
            additionalProperties: false,
          },
        },
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error("Failed to analyze reviews");
    }

    const geminiData = await geminiResponse.json();
    const analysis = JSON.parse(geminiData.choices[0].message.content);

    await sql`
      INSERT INTO business_recommendations 
      (business_name, recommendation_reason, address)
      VALUES 
      (${placeData.data.name}, ${analysis.recommendation}, ${placeData.data.formatted_address})
    `;

    return {
      business_name: placeData.data.name,
      overall_rating: placeData.data.rating,
      review_count: placeData.data.reviews.length,
      analysis,
    };
  } catch (error) {
    console.error("Error analyzing reviews:", error);
    return { error: "Failed to analyze reviews" };
  }
}