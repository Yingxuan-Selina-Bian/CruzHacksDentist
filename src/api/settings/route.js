async function handler({ method, googleMaps, yelp }) {
  if (method === "GET") {
    const keys = await sql`
      SELECT key_name, key_value 
      FROM api_settings 
      WHERE key_name IN ('googleMaps', 'yelp')
    `;

    return {
      googleMaps:
        keys.find((k) => k.key_name === "googleMaps")?.key_value || "",
      yelp: keys.find((k) => k.key_name === "yelp")?.key_value || "",
    };
  }

  if (method === "POST") {
    if (!googleMaps || !yelp) {
      return { error: "Both API keys are required" };
    }

    await sql.transaction([
      sql`
        INSERT INTO api_settings (key_name, key_value)
        VALUES ('googleMaps', ${googleMaps})
        ON CONFLICT (key_name) 
        DO UPDATE SET key_value = ${googleMaps}, updated_at = CURRENT_TIMESTAMP
      `,
      sql`
        INSERT INTO api_settings (key_name, key_value)
        VALUES ('yelp', ${yelp})
        ON CONFLICT (key_name) 
        DO UPDATE SET key_value = ${yelp}, updated_at = CURRENT_TIMESTAMP
      `,
    ]);

    return { success: true };
  }

  return { error: "Method not allowed" };
}