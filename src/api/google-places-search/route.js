async function handler({ location, term, radius = 5000 }) {
  try {
    const apiKeyResult = await sql`
      SELECT key_value 
      FROM api_settings 
      WHERE key_name = 'googleMaps'
      LIMIT 1
    `;

    if (!apiKeyResult?.length) {
      return { error: "Google Maps API key not configured" };
    }

    const apiKey = apiKeyResult[0].key_value;
    const searchQuery = `${term} ${location}`;

    // First get place ID using text search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&radius=${radius}&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.results?.length) {
      return { data: [] };
    }

    // Get detailed information for each place
    const detailedResults = await Promise.all(
      searchData.results.slice(0, 10).map(async (place) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,photos,geometry,business_status,types&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        const details = detailsData.result;

        return {
          name: details.name,
          address: details.formatted_address,
          phone_number: details.formatted_phone_number,
          website: details.website,
          rating: details.rating,
          review_count: details.user_ratings_total,
          latitude: details.geometry?.location?.lat,
          longitude: details.geometry?.location?.lng,
          business_status: details.business_status,
          subtypes: details.types,
          photos_sample: details.photos?.slice(0, 3).map((photo) => ({
            photo_url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${apiKey}`,
          })),
        };
      })
    );

    return {
      data: detailedResults,
    };
  } catch (error) {
    console.error("Google Places API Error:", error);
    return {
      error: "Failed to fetch business data",
    };
  }
}