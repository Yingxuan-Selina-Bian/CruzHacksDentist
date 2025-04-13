"use client";
import React from "react";

function MainComponent() {
  const [location, setLocation] = useState("");
  const [service, setService] = useState("General Dentistry");
  const [distance, setDistance] = useState("5");
  const [suggestions, setSuggestions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [businessAnalysis, setBusinessAnalysis] = useState({});
  const [analyzingReviews, setAnalyzingReviews] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAb6I_EOAaoey1rQJ12Sy26AgJtx0kv354&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initMap = () => {
    if (mapRef.current && !map) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 12,
      });
      setMap(newMap);
    }
  };

  useEffect(() => {
    markers.forEach((marker) => marker.setMap(null));
    setMarkers([]);

    if (map && businesses.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      const newMarkers = businesses.map((business) => {
        const marker = new window.google.maps.Marker({
          position: {
            lat: business.latitude,
            lng: business.longitude,
          },
          map: map,
          title: business.name,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-bold">${business.name}</h3>
              <p>${business.address}</p>
              <p>Rating: ${business.rating || "N/A"} (${
            business.review_count || 0
          } reviews)</p>
            </div>
          `,
        });

        marker.addListener("click", () => {
          setSelectedBusiness(business);
          infoWindow.open(map, marker);
        });

        bounds.extend(marker.getPosition());
        return marker;
      });

      setMarkers(newMarkers);
      map.fitBounds(bounds);
    }
  }, [map, businesses]);

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

  const searchBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/google-places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: service,
          location: location,
          radius: parseInt(distance) * 1000,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch businesses");
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setBusinesses(result.data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch business locations");
    } finally {
      setLoading(false);
    }
  };

  const analyzeBusinessReviews = async (business) => {
    if (!business.place_id || businessAnalysis[business.place_id]) return;

    setAnalyzingReviews(true);
    try {
      const response = await fetch("/api/analyze-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: business.place_id }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze reviews");
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setBusinessAnalysis((prev) => ({
        ...prev,
        [business.place_id]: result.analysis,
      }));
    } catch (error) {
      console.error("Error analyzing reviews:", error);
    } finally {
      setAnalyzingReviews(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness?.place_id) {
      analyzeBusinessReviews(selectedBusiness);
    }
  }, [selectedBusiness]);

  const services = [
    "General Dentistry",
    "Orthodontics",
    "Periodontics",
    "Endodontics",
    "Oral Surgery",
    "Pediatric Dentistry",
    "Cosmetic Dentistry",
  ];

  const distances = [
    { label: "Within 5 miles", value: "5" },
    { label: "Within 10 miles", value: "10" },
    { label: "Within 15 miles", value: "15" },
    { label: "Within 20 miles", value: "20" },
    { label: "Within 25 miles", value: "25" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-blue-800">
            Find Your Perfect Dentist
          </h1>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <div className="relative">
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
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Distance (miles)
                </label>
                <select
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {distances.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={searchBusinesses}
              disabled={!location || loading}
              className="mt-6 bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Searching..." : "Find Dentists"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div
                ref={mapRef}
                className="h-[600px] w-full rounded-lg shadow bg-white"
              ></div>
            </div>

            <div className="space-y-4 overflow-auto max-h-[600px]">
              {businesses.map((business, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-all ${
                    selectedBusiness === business
                      ? "ring-2 ring-blue-500"
                      : "hover:shadow-lg"
                  }`}
                  onClick={() => setSelectedBusiness(business)}
                >
                  <div className="flex flex-col">
                    {business.photos_sample?.[0]?.photo_url && (
                      <img
                        src={business.photos_sample[0].photo_url}
                        alt={business.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-xl text-blue-800 mb-2">
                        {business.name}
                      </h3>

                      <div className="space-y-2 text-gray-600">
                        <p className="flex items-start">
                          <span className="mr-2">📍</span>
                          <span>{business.address}</span>
                        </p>

                        {business.phone_number && (
                          <p className="flex items-center">
                            <span className="mr-2">📞</span>
                            <a
                              href={`tel:${business.phone_number}`}
                              className="hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {business.phone_number}
                            </a>
                          </p>
                        )}

                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-400">⭐</span>
                          <span>{business.rating || "N/A"}</span>
                          {business.review_count > 0 && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>{business.review_count} reviews</span>
                            </>
                          )}
                        </div>

                        {business.website && (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Visit Website
                            <span className="ml-1">→</span>
                          </a>
                        )}

                        {selectedBusiness === business &&
                          analyzingReviews &&
                          !businessAnalysis[business.place_id] && (
                            <div className="mt-4 text-sm text-gray-600">
                              Analyzing reviews...
                            </div>
                          )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {business.subtypes?.map((type, index) => (
                            <span
                              key={index}
                              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full"
                            >
                              {type.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainComponent;