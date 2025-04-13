"use client";
import React from "react";

function MainComponent() {
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [service, setService] = useState("");
  const [distance, setDistance] = useState("5");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDentist, setSelectedDentist] = useState(null);

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
      }
    } else {
      setSuggestions([]);
    }
  };

  const searchDentists = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `Dentist in ${location}`;
      const response = await fetch(
        `/integrations/local-business-data/search?query=${encodeURIComponent(
          query
        )}&limit=10`
      );

      if (!response.ok) {
        throw new Error("Failed to search for dentists");
      }

      const data = await response.json();
      if (data.status !== "OK") {
        throw new Error("Failed to get results");
      }

      setResults(
        data.data.map((dentist) => ({
          name: dentist.name,
          address: dentist.full_address,
          rating: dentist.rating,
          details: {
            phone: dentist.phone_number,
            website: dentist.website,
            total_reviews: dentist.review_count,
          },
          photos: dentist.photos_sample,
          analysis: {
            specialties: dentist.subtypes || [],
            summary: dentist.about?.summary || "",
            highlights: [],
          },
        }))
      );
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-800">
          Find Your Perfect Dentist
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationInput(e.target.value)}
                placeholder="Enter your location"
                className="w-full p-2 border rounded"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
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
                className="w-full p-2 border rounded"
              >
                <option value="">Select service</option>
                <option value="general">General Dentistry</option>
                <option value="cosmetic">Cosmetic Dentistry</option>
                <option value="orthodontics">Orthodontics</option>
                <option value="pediatric">Pediatric Dentistry</option>
                <option value="emergency">Emergency Dental Care</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Distance</label>
              <select
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="5">Within 5 miles</option>
                <option value="10">Within 10 miles</option>
                <option value="20">Within 20 miles</option>
                <option value="30">Within 30 miles</option>
              </select>
            </div>
          </div>

          <button
            onClick={searchDentists}
            disabled={!location || !service || loading}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Find Dentists"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.map((dentist, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-blue-800">
                    {dentist.name}
                  </h2>
                  <p className="text-gray-600">{dentist.address}</p>
                </div>
                {dentist.photos?.[0] && (
                  <img
                    src={dentist.photos[0].photo_url}
                    alt={`${dentist.name} office`}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    <i className="fas fa-star text-yellow-400"></i>{" "}
                    {dentist.rating} ({dentist.details?.total_reviews || 0}{" "}
                    reviews)
                  </span>
                  {dentist.details?.phone && (
                    <span className="text-sm">
                      <i className="fas fa-phone text-gray-400"></i>{" "}
                      {dentist.details.phone}
                    </span>
                  )}
                </div>
              </div>

              {dentist.analysis && (
                <div className="mt-4">
                  <p className="text-gray-700">{dentist.analysis.summary}</p>
                  {dentist.analysis.highlights?.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-medium text-sm">Key Highlights:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                        {dentist.analysis.highlights.map((highlight, i) => (
                          <li key={i}>{highlight.point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {dentist.analysis?.specialties?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm">Specialties:</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {dentist.analysis.specialties.map((specialty, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dentist.details?.website && (
                <a
                  href={dentist.details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  Visit Website
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MainComponent;