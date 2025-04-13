async function handler({ business_id }) {
  if (!business_id) {
    return { error: "Business ID is required" };
  }

  try {
    const response = await fetch(
      `/integrations/local-business-data/search?query=${business_id}&fields=business_id,name,rating,review_count,full_address,phone_number,website,reviews_per_rating,reviews,working_hours,photos_sample&limit=1`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dentist data");
    }

    const data = await response.json();

    if (!data.data || !data.data.length) {
      return { error: "Dentist not found" };
    }

    const business = data.data[0];

    const formattedResponse = {
      business_details: {
        name: business.name,
        address: business.full_address,
        phone: business.phone_number,
        website: business.website,
        rating: business.rating,
        total_reviews: business.review_count,
        working_hours: business.working_hours,
        rating_breakdown: business.reviews_per_rating,
      },
      photos: business.photos_sample || [],
      reviews: business.reviews || [],
    };

    await sql`
      INSERT INTO business_recommendations 
      (business_name, address, website_url, telephone, recommendation_reason)
      VALUES 
      (${business.name}, ${business.full_address}, ${business.website}, ${business.phone_number}, 'Viewed through detailed review search')
    `;

    return formattedResponse;
  } catch (error) {
    console.error("Error fetching dentist reviews:", error);
    return { error: "Failed to fetch dentist information" };
  }
}