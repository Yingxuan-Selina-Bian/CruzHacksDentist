async function handler({ line_id }) {
  try {
    const apiKey = process.env.SFMTA_TOKEN;

    if (!apiKey) {
      return {
        status: 500,
        body: { error: "API key not configured" },
      };
    }

    if (!line_id) {
      return {
        status: 400,
        body: { error: "line_id is required" },
      };
    }

    const response = await fetch(
      `http://api.511.org/transit/patterns?api_key=${apiKey}&operator_id=SF&line_id=${line_id}`
    );

    if (!response.ok) {
      return {
        status: response.status,
        body: { error: "Failed to fetch SFMTA patterns" },
      };
    }

    const data = await response.json();
    return {
      status: 200,
      body: data,
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: "Internal server error" },
    };
  }
}