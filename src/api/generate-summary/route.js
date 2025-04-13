async function handler({
  name,
  rating,
  reviewCount,
  yelpRating,
  yelpReviews,
  services,
  address,
  recommendationReason,
}) {
  try {
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful assistant that creates concise, professional summaries of dental practices based on their information and reviews.",
      },
      {
        role: "user",
        content: `Please create a summary for this dental practice:
          Name: ${name}
          Google Rating: ${rating} (${reviewCount} reviews)
          Yelp Rating: ${yelpRating} (${yelpReviews} reviews)
          Services: ${services}
          Location: ${address}
          Key Strengths: ${recommendationReason}`,
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
          name: "dentist_summary",
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              highlights: {
                type: "array",
                items: { type: "string" },
              },
              patientFocus: { type: "string" },
            },
            required: ["summary", "highlights", "patientFocus"],
            additionalProperties: false,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate summary");
    }

    const result = await response.json();
    const content = JSON.parse(result.choices[0].message.content);

    return {
      ...content,
      practiceInfo: {
        name,
        rating,
        reviewCount,
        yelpRating,
        yelpReviews,
        address,
      },
    };
  } catch (error) {
    return {
      error: "Failed to generate dental practice summary",
    };
  }
}