async function handler({ dentistInfo, reviews }) {
  if (!dentistInfo || !reviews) {
    return {
      error: "Missing required dentist information or reviews",
    };
  }

  const messages = [
    {
      role: "system",
      content:
        "You are a professional dental practice analyst. Analyze the provided dentist information and reviews to create a concise, balanced summary highlighting key aspects of the practice.",
    },
    {
      role: "user",
      content: `Please analyze this dentist's practice and create a summary:
        Practice Information:
        ${JSON.stringify(dentistInfo)}
        
        Patient Reviews:
        ${JSON.stringify(reviews)}`,
    },
  ];

  const schema = {
    name: "dentist_summary",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        highlights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              point: { type: "string" },
            },
            required: ["category", "point"],
            additionalProperties: false,
          },
        },
        rating_analysis: { type: "string" },
        specialties: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["summary", "highlights", "rating_analysis", "specialties"],
      additionalProperties: false,
    },
  };

  try {
    const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        json_schema: schema,
      }),
    });

    const data = await response.json();

    if (!data.status || !data.choices?.[0]?.message?.content) {
      return {
        error: "Failed to generate summary",
      };
    }

    const analysis = JSON.parse(data.choices[0].message.content);

    await sql`
      INSERT INTO business_recommendations (
        business_name,
        address,
        website_url,
        telephone,
        recommendation_reason
      ) VALUES (
        ${dentistInfo.name},
        ${dentistInfo.address},
        ${dentistInfo.website || null},
        ${dentistInfo.phone || null},
        ${analysis.summary}
      )
    `;

    return {
      status: "success",
      analysis,
    };
  } catch (error) {
    return {
      error: "Failed to process dentist information",
    };
  }
}