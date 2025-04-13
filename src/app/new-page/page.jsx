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
  const [apiKeys, setApiKeys] = useState(null);
  const [selectedDentist, setSelectedDentist] = useState(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "GET" }),
        });
        if (!response.ok) throw new Error("Failed to fetch API keys");
        const data = await response.json();
        setApiKeys(data);
      } catch (err) {
        console.error("Error fetching API keys:", err);
        setError("Please configure your API keys in the settings page");
      }
    };
    fetchApiKeys();
  }, []);

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
      const yelpResponse = await fetch("/api/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: `dentist ${service}`,
          location: location,
        }),
      });

      if (!yelpResponse.ok) throw new Error("Failed to fetch dental practices");
      const yelpData = await yelpResponse.json();

      const dentistsWithReviews = await Promise.all(
        yelpData.businesses.map(async (business) => {
          const reviewsResponse = await fetch("/api/rename", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessId: business.id }),
          });
          const reviewsData = await reviewsResponse.json();

          const summaryResponse = await fetch("/api/generate-summary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: business.name,
              rating: business.rating,
              reviewCount: business.review_count,
              services: service,
              address: business.address,
              reviews: reviewsData.reviews || [],
            }),
          });
          const summaryData = await summaryResponse.json();

          return {
            ...business,
            reviews: reviewsData.reviews || [],
            summary: summaryData,
          };
        })
      );

      setResults(dentistsWithReviews);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch dentist recommendations");
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
                    src={dentist.photos[0]}
                    alt={`${dentist.name} office`}
                    className="w-24 h-24 object-cover rounded"
                  />
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm">
                    <i className="fas fa-star text-yellow-400"></i>{" "}
                    {dentist.rating} ({dentist.review_count} reviews)
                  </span>
                  {dentist.phone && (
                    <span className="text-sm">
                      <i className="fas fa-phone text-gray-400"></i>{" "}
                      {dentist.phone}
                    </span>
                  )}
                </div>
              </div>

              {dentist.summary && !dentist.summary.error && (
                <div className="mt-4">
                  <p className="text-gray-700">{dentist.summary.summary}</p>
                  <div className="mt-2">
                    <h4 className="font-medium text-sm">Key Highlights:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                      {dentist.summary.highlights.map((highlight, i) => (
                        <li key={i}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {apiKeys?.googleMaps && dentist.coordinates && (
                <div className="mt-4 h-48 rounded overflow-hidden">
                  <iframe
                    title={`Map of ${dentist.name}`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    src={`https://www.google.com/maps/embed/v1/place?key=${
                      apiKeys.googleMaps
                    }&q=${encodeURIComponent(dentist.address)}&zoom=15`}
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {dentist.url && (
                <a
                  href={dentist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-blue-600 hover:underline"
                >
                  View on Yelp
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