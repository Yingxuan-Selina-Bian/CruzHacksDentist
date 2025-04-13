async function handler({ location, term, radius }) {
  if (!location || !term) {
    return {
      error: "Missing required parameters: location and term required",
    };
  }

  try {
    const apiKeyResult = await sql`
      SELECT key_value 
      FROM api_settings 
      WHERE key_name = 'yelp'
      LIMIT 1
    `;

    if (!apiKeyResult?.[0]?.key_value) {
      return {
        error: "Yelp API key not configured",
      };
    }

    const searchParams = new URLSearchParams({
      term,
      location,
      limit: "20",
    });

    if (radius) {
      searchParams.append("radius", Math.min(radius * 1609.34, 40000));
    }

    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKeyResult[0].key_value}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yelp API error: ${response.status}`);
    }

    const data = await response.json();

    const businesses = data.businesses.map((business) => ({
      id: business.id,
      name: business.name,
      rating: business.rating,
      review_count: business.review_count,
      phone: business.phone,
      address: business.location.display_address.join(", "),
      coordinates: {
        latitude: business.coordinates.latitude,
        longitude: business.coordinates.longitude,
      },
      photos: business.image_url ? [business.image_url] : [],
      url: business.url,
      price: business.price || "N/A",
      categories: business.categories.map((cat) => cat.title),
    }));

    return {
      businesses,
      total: data.total,
    };
  } catch (error) {
    console.error("Yelp API Error:", error);
    return {
      error: "Failed to fetch business data from Yelp",
      details: error.message,
    };
  }
}