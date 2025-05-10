import express from "express";
import bodyParser from "body-parser";
import pool from "./db.js";
import morgan from "morgan";

const app = express();
const port = 3000;

app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

let currentUserId = 1;

// let users = [
//   { id: 1, name: "Angela", color: "teal" },
//   { id: 2, name: "Jack", color: "powderblue" },
// ];

let users = [];
let countriesCodeConstant = [];
let countriesNameConstant = [];
let currentError = null;
let currentUser = {};
// let visitedCountries = [];


async function getCountriesCode() {
  try {
    console.log("Fetching countries code...");
    const rows = await pool.query("SELECT country_code,country_name FROM countries");
    // console.log(rows);
    countriesCodeConstant = rows.rows.map(row => row.country_code);
    countriesNameConstant = rows.rows.map(row => row.country_name);
    console.log(`Finished fetching ${countriesCodeConstant.length} countries code.`);
    // console.log(countryCodes);
  }
  catch (err) {
    console.error("Error fetching countries code:", err);
  }
};

async function getUsers() {
  try {
    console.log("Fetching users...");
    const rows = await pool.query("SELECT id, name, color FROM users");
    // console.log(rows);
    users = rows.rows.map(row => {
      return {
        id: row.id,
        name: row.name,
        color: row.color
      };
    });
    console.log(users);
    console.log(`Finished fetching ${users.length} users.`);
  } catch (err) {
    console.error("Error fetching users:", err);
}
};


async function initialize() {
  await getCountriesCode();
  // await getVisitedCountries();
  await getUsers();
};

initialize();

async function getVisitedCountries(userId) {
  try {
    console.log("Fetching visited countries...");
    const rows = await pool.query("SELECT country_code FROM visited_country WHERE user_id = $1", [userId]);
    // console.log(rows);
    const visitedCountries = rows.rows.map(row => row.country_code);
    console.log(`Finished fetching ${visitedCountries.length} visited countries for user ${userId}.`);
    return visitedCountries;
  } catch (err) {
    console.error("Error fetching visited countries:", err);
}
};


app.get("/", async (req, res) => {
  if (Object.keys(currentUser).length === 0 && users.length > 0) {
    currentUser = users[0];
  } else if (Object.keys(currentUser).length === 0 && users.length === 0) {
    currentUser = {};
  }
  const countries = await getVisitedCountries(currentUser.id);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: "teal",
    error: currentError,
  });
  currentError = null;
});


app.post("/add", async (req, res) => {
  if (Object.keys(currentUser).length === 0) {
    currentError = "Please add a user first";
    return res.redirect("/");
  }
  console.log(currentUser);
  const country = req.body.country;
  // console.log(country);
  const index = countriesNameConstant.findIndex(name => name.toLowerCase().includes(country.toLowerCase()));
  // console.log(index);
  
  if (index === -1) {
    console.log("Country not found");
    currentError = "Country not found";
    return res.redirect("/");
  };
  const countryCode = countriesCodeConstant[index];
  
  if (countryCode) {
    try {
      await pool.query("INSERT INTO visited_country (country_code,user_id) VALUES ($1,$2)", [countryCode, currentUser.id]);
      console.log(`Country ${countryCode} added to visited countries.`);
      res.redirect("/");
    } catch (err) {
      console.error("Error adding country: ", err);
      currentError = "Country already exists";
      res.redirect("/");
    }

  }
  // res.redirect("/");
});


app.post("/user", async (req, res) => {
  if (req.body.add) {
    // currentError = "Name is required";
    return res.render("new.ejs");
  }

  const user_id = parseInt(req.body.user);
  currentUser = users.find(user => user.id === user_id);
  // console.log(currentUser);
  if (currentUser) {
    console.log(`User ${currentUser.name} selected.`);
    res.redirect("/");
  } else {
    console.log("User not found");
    currentError = "User not found";
    res.redirect("/");
  }
});

async function addUser(name, color) {
  try {
    const result = await pool.query("INSERT INTO users (name,color) VALUES ($1,$2) RETURNING id", [name, color]);
    console.log(`User ${name} added with id ${result.rows[0].id}.`);
    users.push({
      id: result.rows[0].id,
      name: name,
      color: color
    });
    return result.rows[0].id;
  } catch (err) {
    console.error("Error adding user: ", err);
    currentError = "User already exists";
    return null;
  }
};

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html

  const name = req.body.name;
  const color = req.body.color;

  const userId = await addUser(name, color);
  if (userId) {
    currentUser = users.find(user => user.id === userId);
    console.log(`User ${currentUser.name} selected.`);
    res.redirect("/");
  } else {
    // console.log("User not found");
    // currentError = "User not found";
    res.redirect("/");
  }

});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
