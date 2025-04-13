async function handler({ dentist, reviews }) {
  if (!dentist || !reviews || !Array.isArray(reviews)) {
    return {
      error: "Missing required parameters: dentist and reviews array",
    };
  }

  try {
    const messages = [
      {
        role: "system",
        content:
          "You are a dental practice analyst who specializes in analyzing patient reviews to identify patterns and insights.",
      },
      {
        role: "user",
        content: `Please analyze these reviews for ${
          dentist.name
        }. Focus on key strengths, areas for improvement, and overall patient satisfaction patterns.

Reviews to analyze:
${reviews
  .map(
    (review) => `- Rating: ${review.rating}/5
Comment: ${review.text || "No comment provided"}
Date: ${review.time || "No date provided"}`
  )
  .join("\n\n")}`,
      },
    ];

    const response = await fetch("/integrations/google-gemini-1-5/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        json_schema: {
          name: "review_analysis",
          schema: {
            type: "object",
            properties: {
              overall_rating_analysis: {
                type: "string",
              },
              key_strengths: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              areas_for_improvement: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              patient_satisfaction_patterns: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              sentiment_summary: {
                type: "string",
              },
            },
            required: [
              "overall_rating_analysis",
              "key_strengths",
              "areas_for_improvement",
              "patient_satisfaction_patterns",
              "sentiment_summary",
            ],
            additionalProperties: false,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze reviews");
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    await sql`
      INSERT INTO business_recommendations 
      (business_name, recommendation_reason, rating)
      VALUES 
      (${dentist.name}, ${analysis.sentiment_summary}, ${dentist.rating})
    `;

    return {
      dentist_name: dentist.name,
      ...analysis,
    };
  } catch (error) {
    console.error("Error analyzing reviews:", error);
    return {
      error: "Failed to analyze reviews",
    };
  }
}