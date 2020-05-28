const { query } = require('../db/index')

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return query(`SELECT * FROM users WHERE email = $1`, [email])
    .then(res => res.rows.length === 0 ? null : res.rows[0])
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return query(`SELECT * FROM users WHERE id = $1`, [id])
  .then(res => res.rows.length === 0 ? null : res.rows[0])
}

exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser =  function(user) {
  return query(`INSERT INTO users (name, password, email) VALUES ($1, $2, $3) returning *;`, [user.name, user.password, user.email])
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return query(`
  SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`, [guest_id, limit])
  .then(res => res.rows)
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  let whereClause = false;
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city}%`);
    if (!whereClause) {
      queryString += `WHERE city LIKE $${queryParams.length} `;
      whereClause = true;
    } else {
      queryString += `AND city LIKE $${queryParams.length} `
    }
  }

  if (options.minimum_price_per_night || options.maximum_price_per_night) {
    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(options.minimum_price_per_night);
      queryParams.push(options.maximum_price_per_night);
      if (!whereClause) {
        queryString += `WHERE cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}  `;
        whereClause = true;
      } else {
        queryString += `AND cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length}  `
      }
    } else if (options.minimum_price_per_night) {
      queryParams.push(options.minimum_price_per_night);
      if (!whereClause) {
        queryString += `WHERE cost_per_night > $${queryParams.length}  `;
        whereClause = true;
      } else {
        queryString += `AND cost_per_night > $${queryParams.length}  `
      }
    } else if (options.maximum_price_per_night) {
      queryParams.push(options.maximum_price_per_night);
      if (!whereClause) {
        queryString += `WHERE cost_per_night < $${queryParams.length}  `;
        whereClause = true;
      } else {
        queryString += `AND cost_per_night < $${queryParams.length}  `
      }
    }
  }

  if(options.minimum_rating) {
    queryParams.push(options.minimum_rating)
    if (!whereClause) {
      queryString += `WHERE rating > $${queryParams.length} `;
      whereClause = true;
    } else {
      queryString += `AND rating > $${queryParams.length} `
    }
  }

  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  console.log(queryString, queryParams);

  return query(queryString, queryParams)
  .then(res => res.rows);
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  return query(`
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url,cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
  [property.owner_id, 
    property.title, 
    property.description, 
    property.thumbnail_photo_url,
    property.cover_photo_url, 
    property.cost_per_night, 
    property.street, 
    property.city, 
    property.province, 
    property.post_code, 
    property.country, 
    property.parking_spaces, 
    property.number_of_bathrooms, 
    property.number_of_bedrooms]
  )
}
exports.addProperty = addProperty;
