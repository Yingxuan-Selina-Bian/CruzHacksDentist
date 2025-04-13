"use client";
import React from "react";

function MainComponent() {
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [service, setService] = useState("");
  const [distance, setDistance] = useState("5");
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedDentists, setSavedDentists] = useState([]);
  const [dentistImages, setDentistImages] = useState({});
  const [mapView, setMapView] = useState(null);
  const [dentistSummaries, setDentistSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});

  const handleLocationInput = async (input) => {
    setLocation(input);
    if (input.length > 2) {
      try {
        const response = await fetch(
          `/integrations/google-place-autocomplete/autocomplete/json?input=${encodeURIComponent(
            input
          )}&radius=50000`
        );
        if (!response.ok) throw new Error("Failed to fetch suggestions");
        const data = await response.json();
        setSuggestions(data.predictions);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const fetchAdditionalImages = async (dentist) => {
    try {
      const query = `${dentist.name} dental office ${dentist.formatted_address}`;
      const response = await fetch(
        `/integrations/image-search/imagesearch?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error("Failed to fetch images");
      const data = await response.json();
      return data.items?.[0]?.originalImageUrl;
    } catch (err) {
      console.error("Error fetching additional images:", err);
      return null;
    }
  };

  const searchDentists = async () => {
    setLoading(true);
    setError(null);
    try {
      const geocodeResponse = await fetch(
        `/integrations/local-business-data/search?query=${encodeURIComponent(
          location
        )}&limit=1`
      );
      if (!geocodeResponse.ok) throw new Error("Failed to geocode location");
      const geocodeData = await geocodeResponse.json();
      const userLocation = geocodeData.data?.[0];

      if (!userLocation?.latitude || !userLocation?.longitude) {
        throw new Error("Could not determine location coordinates");
      }

      const query = `Dentist ${service}`;
      const response = await fetch(
        `/integrations/local-business-data/search?query=${encodeURIComponent(
          query
        )}&lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=${
          distance * 1609.34
        }&limit=10`
      );

      if (!response.ok) throw new Error("Failed to search for dentists");
      const data = await response.json();

      const dentistsWithDistance = data.data
        .map((dentist) => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            dentist.latitude,
            dentist.longitude
          );
          return { ...dentist, distance };
        })
        .filter((dentist) => dentist.distance <= parseInt(distance));

      setDentists(dentistsWithDistance);

      const imagePromises = dentistsWithDistance.map(async (dentist) => {
        if (!dentist.photos_sample?.[0]?.photo_url) {
          const additionalImage = await fetchAdditionalImages(dentist);
          if (additionalImage) {
            setDentistImages((prev) => ({
              ...prev,
              [dentist.place_id]: additionalImage,
            }));
          }
        }
      });

      await Promise.all(imagePromises);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to find dentists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const generateQuickSummary = async (dentist) => {
    if (dentistSummaries[dentist.place_id]) return;

    setLoadingSummaries((prev) => ({ ...prev, [dentist.place_id]: true }));
    try {
      const response = await fetch("/integrations/google-gemini-1-5/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a dental practice analyst. Provide a brief, factual summary of this dental practice.",
            },
            {
              role: "user",
              content: `Summarize this dental practice in 2-3 short sentences, focusing on location, services, and key highlights from reviews:
            Name: ${dentist.name}
            Address: ${dentist.formatted_address}
            Rating: ${dentist.rating} (${dentist.review_count} reviews)
            Distance: ${dentist.distance?.toFixed(1)} miles
            ${
              dentist.reviews
                ? `Reviews: ${dentist.reviews.map((r) => r.text).join(" ")}`
                : ""
            }`,
            },
          ],
          json_schema: {
            name: "quick_summary",
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
              },
              required: ["summary"],
              additionalProperties: false,
            },
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to generate summary");
      const result = await response.json();
      const data = JSON.parse(result.choices[0].message.content);

      setDentistSummaries((prev) => ({
        ...prev,
        [dentist.place_id]: data.summary,
      }));
    } catch (err) {
      console.error("Error generating quick summary:", err);
    } finally {
      setLoadingSummaries((prev) => ({ ...prev, [dentist.place_id]: false }));
    }
  };

  const saveDentist = (dentist) => {
    setSavedDentists((prev) => {
      const exists = prev.some((d) => d.place_id === dentist.place_id);
      if (!exists) {
        return [...prev, dentist];
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 mb-8">
          Find Your Perfect Dentist
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationInput(e.target.value)}
                placeholder="Enter ZIP code or address"
                className="w-full p-3 border rounded-lg"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setLocation(suggestion.description);
                        setSuggestions([]);
                      }}
                    >
                      {suggestion.description}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Service Needed
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Select service</option>
                <option value="General Dentistry">General Dentistry</option>
                <option value="Cosmetic Dentistry">Cosmetic Dentistry</option>
                <option value="Orthodontics">Orthodontics</option>
                <option value="Pediatric Dentistry">Pediatric Dentistry</option>
                <option value="Emergency Care">Emergency Care</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Distance (miles)
              </label>
              <select
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="1">Within 1 mile</option>
                <option value="2">Within 2 miles</option>
                <option value="3">Within 3 miles</option>
                <option value="5">Within 5 miles</option>
                <option value="10">Within 10 miles</option>
                <option value="20">Within 20 miles</option>
              </select>
            </div>
          </div>

          <button
            onClick={searchDentists}
            disabled={!location || !service || loading}
            className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg"
          >
            {loading ? "Searching..." : "Find Dentists"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {dentists.map((dentist) => {
            if (
              !dentistSummaries[dentist.place_id] &&
              !loadingSummaries[dentist.place_id]
            ) {
              generateQuickSummary(dentist);
            }

            return (
              <div
                key={dentist.place_id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="p-6 md:col-span-5">
                    <h3 className="text-2xl font-semibold text-blue-800 mb-2">
                      {dentist.name}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {dentist.formatted_address}
                    </p>

                    <div className="mb-4">
                      <div className="mb-3 flex items-center">
                        <span className="text-yellow-500 text-lg">
                          {"★".repeat(Math.round(dentist.rating || 0))}
                          {"☆".repeat(5 - Math.round(dentist.rating || 0))}
                        </span>
                        <span className="text-gray-700 ml-2 font-medium">
                          {dentist.rating?.toFixed(1)}
                        </span>
                        <span className="text-gray-600 ml-2">
                          ({dentist.review_count || 0} reviews)
                        </span>
                      </div>
                      {dentist.phone_number && (
                        <p className="text-gray-600">
                          <i className="fas fa-phone mr-2"></i>
                          {dentist.phone_number}
                        </p>
                      )}
                      {dentist.website && (
                        <a
                          href={dentist.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline block mt-2"
                        >
                          <i className="fas fa-globe mr-2"></i>
                          Visit Website
                        </a>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-600">
                        <i className="fas fa-location-dot mr-2"></i>
                        {dentist.distance
                          ? `${dentist.distance.toFixed(1)} miles away`
                          : "Distance not available"}
                      </p>
                      {dentist.opening_hours && (
                        <p className="text-gray-600 mt-2">
                          <i className="fas fa-clock mr-2"></i>
                          {dentist.opening_hours.open_now
                            ? "Open now"
                            : "Closed"}
                          {dentist.opening_hours.weekday_text && (
                            <span className="block ml-6 text-sm mt-1">
                              {
                                dentist.opening_hours.weekday_text[
                                  new Date().getDay()
                                ]
                              }
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {loadingSummaries[dentist.place_id] ? (
                      <p className="text-gray-500 text-sm italic">
                        Generating summary...
                      </p>
                    ) : dentistSummaries[dentist.place_id] ? (
                      <div className="mt-4 text-gray-700 bg-blue-50 p-4 rounded-lg">
                        {dentistSummaries[dentist.place_id]}
                      </div>
                    ) : null}

                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={() => saveDentist(dentist)}
                        className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4 h-64 md:h-auto relative">
                    {dentist.photos_sample?.[0]?.photo_url ||
                    dentistImages[dentist.place_id] ? (
                      <img
                        src={
                          dentist.photos_sample?.[0]?.photo_url ||
                          dentistImages[dentist.place_id]
                        }
                        alt={dentist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <i className="fas fa-image text-gray-400 text-4xl"></i>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-3 h-64 md:h-auto relative">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyATUFnawTCYkmu6poByQFrRQocOO0LKGiI&q=place_id:${dentist.place_id}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0, minHeight: "100%" }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Saved Dentists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(savedDentists) &&
              savedDentists.map((dentist) => (
                <div
                  key={dentist.place_id}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <h3 className="font-medium text-lg">{dentist.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {dentist.formatted_address}
                  </p>
                  <div className="text-sm text-yellow-500 mt-2">
                    {"★".repeat(Math.round(dentist.rating || 0))}
                    <span className="text-gray-600 ml-1">
                      ({dentist.review_count})
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${dentist.place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm block mt-2"
                  >
                    <i className="fas fa-location-dot mr-1"></i>
                    View on Map
                  </a>
                </div>
              ))}
            {(!Array.isArray(savedDentists) || savedDentists.length === 0) && (
              <p className="text-gray-500 col-span-full">
                No saved dentists yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainComponent;