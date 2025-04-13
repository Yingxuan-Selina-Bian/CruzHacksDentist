async function handler() {
  try {
    const apiKey = process.env.SFMTA_TOKEN;

    if (!apiKey) {
      return {
        status: 500,
        body: { error: "API key not configured" },
      };
    }

    const response = await fetch(
      `http://api.511.org/transit/lines?api_key=${apiKey}&operator_id=SF`
    );

    if (!response.ok) {
      return {
        status: response.status,
        body: { error: "Failed to fetch SFMTA lines" },
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