async function handler({ stopCode }) {
  try {
    const apiKey = process.env.SFMTA_TOKEN;

    if (!apiKey) {
      return {
        status: 500,
        body: { error: "API key not configured" },
      };
    }

    if (!stopCode) {
      return {
        status: 400,
        body: { error: "stopCode is required" },
      };
    }

    const response = await fetch(
      `http://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=SF&stopCode=${stopCode}`
    );

    if (!response.ok) {
      return {
        status: response.status,
        body: { error: "Failed to fetch stop monitoring data" },
      };
    }

    const data = await response.json();
    return {
      status: 200,
      body: data,
    };
  } catch (error) {
    console.error("Error fetching stop monitoring data:", error);
    return {
      status: 500,
      body: { error: "Internal server error" },
    };
  }
}