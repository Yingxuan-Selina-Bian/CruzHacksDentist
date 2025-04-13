async function handler({ location, serviceType }) {
  if (!location) {
    return { error: "Location is required" };
  }

  try {
    // Build the search query
    let searchQuery = `Dentist ${serviceType || ""} in ${location}`;

    // Search for dentists using Local Business Data API
    const response = await fetch(
      `/integrations/local-business-data/search?query=${encodeURIComponent(
        searchQuery
      )}&limit=20&business_status=OPEN&subtypes=Dentist&verified=true`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dentists");
    }

    const result = await response.json();

    if (result.status !== "OK" || !result.data) {
      return { error: "No results found" };
    }

    // Format the results
    const dentists = result.data.map((dentist) => ({
      id: dentist.business_id,
      name: dentist.name,
      address: dentist.full_address,
      phone: dentist.phone_number,
      rating: dentist.rating,
      reviewCount: dentist.review_count,
      website: dentist.website,
      placeId: dentist.place_id,
      latitude: dentist.latitude,
      longitude: dentist.longitude,
      businessStatus: dentist.business_status,
      verified: dentist.verified,
    }));

    return {
      success: true,
      results: dentists,
      total: dentists.length,
    };
  } catch (error) {
    console.error("Error searching dentists:", error);
    return { error: "Failed to search for dentists" };
  }
}