async function handler({
  method,
  id,
  business_name,
  address,
  website_url,
  telephone,
  recommendation_reason,
}) {
  switch (method) {
    case "CREATE":
      if (!business_name || !address || !recommendation_reason) {
        return { error: "Missing required fields" };
      }

      const created = await sql`
        INSERT INTO business_recommendations 
        (business_name, address, website_url, telephone, recommendation_reason)
        VALUES (${business_name}, ${address}, ${website_url}, ${telephone}, ${recommendation_reason})
        RETURNING *
      `;
      return { recommendation: created[0] };

    case "READ":
      if (!id) {
        return { error: "Missing id" };
      }

      const found = await sql`
        SELECT * FROM business_recommendations 
        WHERE id = ${id}
      `;
      return found.length
        ? { recommendation: found[0] }
        : { error: "Recommendation not found" };

    case "UPDATE":
      if (!id) {
        return { error: "Missing id" };
      }

      const setValues = [];
      const queryParams = [];
      let paramCount = 1;

      if (business_name) {
        setValues.push(`business_name = $${paramCount}`);
        queryParams.push(business_name);
        paramCount++;
      }
      if (address) {
        setValues.push(`address = $${paramCount}`);
        queryParams.push(address);
        paramCount++;
      }
      if (website_url) {
        setValues.push(`website_url = $${paramCount}`);
        queryParams.push(website_url);
        paramCount++;
      }
      if (telephone) {
        setValues.push(`telephone = $${paramCount}`);
        queryParams.push(telephone);
        paramCount++;
      }
      if (recommendation_reason) {
        setValues.push(`recommendation_reason = $${paramCount}`);
        queryParams.push(recommendation_reason);
        paramCount++;
      }

      if (setValues.length === 0) {
        return { error: "No fields to update" };
      }

      queryParams.push(id);
      const updated = await sql(
        `UPDATE business_recommendations 
        SET ${setValues.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *`,
        queryParams
      );

      return updated.length
        ? { recommendation: updated[0] }
        : { error: "Recommendation not found" };

    case "LIST":
      const recommendations = await sql`
        SELECT * FROM business_recommendations 
        ORDER BY created_at DESC
      `;
      return { recommendations };

    case "DELETE":
      if (!id) {
        return { error: "Missing id" };
      }

      const deleted = await sql`
        DELETE FROM business_recommendations 
        WHERE id = ${id}
        RETURNING *
      `;
      return deleted.length
        ? { recommendation: deleted[0] }
        : { error: "Recommendation not found" };

    default:
      return { error: "Invalid method" };
  }
}