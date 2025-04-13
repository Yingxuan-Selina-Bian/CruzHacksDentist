"use client";
import React from "react";

function MainComponent() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newRecommendation, setNewRecommendation] = useState({
    name: "",
    address: "",
    website: "",
    phone: "",
    reason: "",
    rating: "",
    category: "General Dentistry",
  });

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations");
      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }
      const data = await response.json();
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("Failed to load recommendations");
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRecommendation),
      });

      if (!response.ok) {
        throw new Error("Failed to add recommendation");
      }

      await fetchRecommendations();
      setShowForm(false);
      setNewRecommendation({
        name: "",
        address: "",
        website: "",
        phone: "",
        reason: "",
        rating: "",
        category: "General Dentistry",
      });
    } catch (err) {
      console.error("Error adding recommendation:", err);
      setError("Failed to add recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRecommendation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-800">
            Business Recommendations
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            {showForm ? "Cancel" : "Add New Recommendation"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Add New Recommendation
            </h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newRecommendation.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={newRecommendation.category}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                >
                  <option value="General Dentistry">General Dentistry</option>
                  <option value="Orthodontics">Orthodontics</option>
                  <option value="Periodontics">Periodontics</option>
                  <option value="Cosmetic Dentistry">Cosmetic Dentistry</option>
                  <option value="Pediatric Dentistry">
                    Pediatric Dentistry
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={newRecommendation.address}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  value={newRecommendation.website}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newRecommendation.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Rating (1-5)
                </label>
                <input
                  type="number"
                  name="rating"
                  min="1"
                  max="5"
                  value={newRecommendation.rating}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Reason for Recommendation
                </label>
                <textarea
                  name="reason"
                  value={newRecommendation.reason}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  rows="3"
                  required
                ></textarea>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? "Adding..." : "Add Recommendation"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && !showForm ? (
          <div className="text-center py-8">Loading recommendations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.isArray(recommendations) &&
              recommendations.map((recommendation, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold text-blue-800">
                      {recommendation.name}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                      {recommendation.category}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="flex items-start text-gray-600">
                      <span className="mr-2">📍</span>
                      {recommendation.address}
                    </p>

                    {recommendation.phone && (
                      <p className="flex items-center text-gray-600">
                        <span className="mr-2">📞</span>
                        <a
                          href={`tel:${recommendation.phone}`}
                          className="hover:text-blue-600"
                        >
                          {recommendation.phone}
                        </a>
                      </p>
                    )}

                    {recommendation.website && (
                      <p className="flex items-center text-gray-600">
                        <span className="mr-2">🌐</span>
                        <a
                          href={recommendation.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      </p>
                    )}

                    {recommendation.rating && (
                      <p className="flex items-center text-gray-600">
                        <span className="mr-2">⭐</span>
                        {recommendation.rating} / 5
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-gray-700">
                        <span className="font-medium">Why we recommend:</span>{" "}
                        {recommendation.reason}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {!loading && (!recommendations || recommendations.length === 0) && (
          <div className="text-center py-8 text-gray-600">
            No recommendations yet. Add your first recommendation!
          </div>
        )}
      </div>
    </div>
  );
}

export default MainComponent;