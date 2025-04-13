async function handler({ dentist, userNeeds }) {
  if (!dentist || !userNeeds) {
    return { error: "Missing required parameters" };
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a dental care expert assistant helping match patients with the right dentist. Provide personalized recommendations based on the dentist's profile and patient needs.",
    },
    {
      role: "user",
      content: `Please analyze this dentist and provide a personalized recommendation.
      
Dentist Information:
Name: ${dentist.name}
Services: ${dentist.services?.join(", ") || "General Dentistry"}
Rating: ${dentist.rating || "Not rated"}
Reviews: ${dentist.review_count || 0} reviews
Specialties: ${dentist.specialties?.join(", ") || "Not specified"}

Patient Needs: ${userNeeds}

Provide a natural, conversational recommendation explaining why this dentist would or would not be a good match for the patient's needs. Focus on specific aspects that align with the patient's requirements.`,
    },
  ];

  try {
    const response = await fetch("/integrations/google-gemini-1-5/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        json_schema: {
          name: "dentist_recommendation",
          schema: {
            type: "object",
            properties: {
              recommendation_reason: { type: "string" },
              confidence_score: { type: "number" },
              key_matches: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "recommendation_reason",
              "confidence_score",
              "key_matches",
            ],
            additionalProperties: false,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate recommendation");
    }

    const result = await response.json();
    const recommendation = JSON.parse(result.choices[0].message.content);

    await sql`
      INSERT INTO business_recommendations 
      (business_name, address, recommendation_reason, rating, services)
      VALUES 
      (${dentist.name}, ${dentist.address}, ${
      recommendation.recommendation_reason
    }, ${dentist.rating}, ${dentist.services || []})
    `;

    return {
      ...recommendation,
      dentist_name: dentist.name,
    };
  } catch (error) {
    console.error("Error generating recommendation:", error);
    return {
      error: "Failed to generate recommendation",
    };
  }
}