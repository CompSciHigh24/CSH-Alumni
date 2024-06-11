const mongoose = require("mongoose");
const ejs = require("ejs");
const express = require("express");
const basicAuth = require("express-basic-auth");
const app = express();
const path = require("path");

//Google API
const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
//

app.use(express.static(path.join(__dirname + "/public")));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method}: ${req.path}`);
  next();
});

const mongoDBConnectionString =
  "mongodb+srv://SE12:CSH2024@cluster0.u4mojzg.mongodb.net/Alumni?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(mongoDBConnectionString)
  .then(() => {
    console.log("MongoDB connection successful.");
  })
  .catch((err) => console.log("MongoDB connection error:", err));

//GOOGLE API
app.use(
  session({
    secret: process.env.SECRET, // add secrets on replit
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 2 * 24 * 60 * 60 * 1000, // determines how long you will be logged in for
    },
  }),
);

// passport library middleware
app.use(passport.initialize());
app.use(passport.session());

//Middleware that checks if user is logged in
const isLoggedIn = (req, res, next) => {
  // if (req.user) {
  //   // req.user is added when logged in
  //   // if logged in continue to route w/ next()
  //   console.log("logged in");
  next();
  // } else {
  //   // If no req.user redirect to login
  //   console.log("not logged in");
  //   res.redirect("/");
  // }
};

//Middleware that checks if user is the owner of a document
const isOwner = (req, res, next) => {
  // Resource.findOne({ _id: req.params.id }).then((stu) => {
  //   if (stu.profile_id.toString() !== req.user._id) {
  //     // first verifys that the owner of the loaner is the same person who is logged in
  //     // if they are not owned by the same person
  //     console.log("not authed");
  //     res.status(403).send("You are not authorized to modify this profile.");
  //   } else {
  //     // if they are owned by the same person allows the middleware to continue
  //     console.log("authed!");
  next();
  //   }
  // });
};

// Schema and model for School
const profileSchema = new mongoose.Schema({
  photo: { type: String },
  name: { type: String, require: true },
  location: { type: String },
  gradyear: { type: Number },
  occupation: { type: String },
  bio: { type: String },
  careerplan: { type: String },
  description: { type: String },
  email: { type: String, require: true, unique: true },
  google_id: { type: String, require: true },
});

const Profile = mongoose.model("Profile", profileSchema);

const resourceSchema = new mongoose.Schema({
  attachments: { type: String },
  text: { type: String },
  profile_id: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
  nameAlumni: { type: String },
});

const Resource = mongoose.model("Resource", resourceSchema);

const eventSchema = new mongoose.Schema({
  attachments: { type: String },
  text: { type: String },
  start: { type: Date },
  end: { type: Date },
});

// Use DateNow()

const Event = mongoose.model("Event", eventSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

app.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    prompt: "select_account",
  }),
);

app.get(
  "/google/callback",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    failureRedirect: "/failed",
  }),
  (req, res) => {
    res.redirect("/home");
  },
);

//

// // middleware added, first checks if they are logged in, then if they are authorized to delete
// app.delete("/item/:id", isLoggedIn, isOwner, (req, res) => {
//   LoanerItem.findOneAndDelete({ profile_id: req.params.id }).then((itm) => {
//     res.redirect("/");
//   });
// });

app.get("/failed", (req, res) => {
  console.log("User is not authenticated");
  res.send("Failed");
});
//
// logout destroys the session
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error while destroying session:", err);
    } else {
      req.logout(() => {
        console.log("You are logged out");
        res.redirect("/");
      });
    }
  });
});

// FUNCTION
function getGradYear(email) {
  return Number("20" + email.split("@")[0].slice(-2));
  // email = "david.cardoso24@compscihigh.org"
  // email.split("@") = ["david.cardoso24", "compscihigh.org"]
  // email.split("@")[0] = "david.cardoso24"
  // email.split("@")[0].slice(-2) = "24"
  // Number("20" + email.split("@")[0].slice(-2))
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL:
        "https://a68f40fa-0ad6-4452-933b-a4340ca5afab-00-sesc0ups9p8z.spock.replit.dev/google/callback", // hits the /google/callback route we created
      passReqToCallback: true,
    },
    (request, accessToken, refreshToken, googleProfile, done) => {
      // add "if" statement to block non-compscihigh email addresses
      if (!googleProfile.email.endsWith("@compscihigh.org")) {
        done("Must have Comp Sci High email address");
        return;
      }

      // when logging in checks if profile exists in data base or not
      Profile.findOne({ google_id: googleProfile.id }).then((user) => {
        if (!user) {
          // if user doesn't exist then create a new user in mongoDB
          let newUser = new Profile({
            name: googleProfile.displayName,
            google_id: googleProfile.id,
            email: googleProfile.email,
          });

          const gradYear = getGradYear(googleProfile.email);
          if(gradYear) {
            newUser.gradYear = gradYear
          }

          newUser.save().then((newUser) => {
            done(null, {
              // adds the _id to the req.user which saves us from unneccsary queries
              _id: newUser._id,
            });
            console.log("Profile added to database");
          });
        } else {
          // if user exists, there's no need to create anything in mongoDB
          console.log("logged In");
          done(null, {
            _id: user._id,
          });
        }
      });
    },
  ),
);

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser((user, done) => done(null, user));
//

//HOME
app.get("/home", isLoggedIn, (req, res) => {
  Profile.find({}).then((data) => {
    res.render("home.ejs", { oren: data });
  });
});

/////////

//ADMIN
app.get(
  "/admin",
  basicAuth({ challenge: true, users: { admin: "elvisbanana" } }),
  (req, res) => {
    Profile.find({}).then((data) => {
      res.render("admin.ejs", { oren: data });
    });
  },
);

//////////

//ACCOUNT
app.get("/account", isLoggedIn, isOwner, (req, res) => {
  Profile.find({}).then((data) => {
    res.render("account.ejs", { oren: data });
  });
});

/////////

//PROFILES

app.post("/profiles", (req, res) => {
  const newProfile = new Profile({
    // photo: req.body.photo,
    name: req.body.name,
    location: req.body.location,
    gradyear: req.body.gradyear,
    bio: req.body.bio,
    // careerplan: req.body.careerplan,
    email: req.body.email,
  });

  newProfile
    .save()
    .then((resource) => {
      console.log(resource);
      res.json(resource);
    })
    .catch((error) => {
      console.log(error);
      res.status(404).json({ error: "Failed to create profile" });
    });
});

app.get("/api/profiles", isLoggedIn, (req, res) => {
  Profile.find({}).then((data) => {
    res.json(data);
  });
});

app.get("/profiles", isLoggedIn, (req, res) => {
  /*
   * Add logic to get query parameters from the request
   * Use those query parameters (if any) to filter the profiles in Profile.find({})
   * Pass filtered data into profile.ejs
   */
  console.log(req.query);
  console.log(req.query.search);
  // https://stackoverflow.com/questions/26814456/how-to-get-all-the-values-that-contains-part-of-a-string-using-mongoose-find
  const mongooseQuery = {};

  // IF req.query.search exists, then add a regex search into mongooseQuery
  
  Profile.find(mongooseQuery).then((data) => {
    res.render("profile.ejs", { found: data });
  });
});

app.get("/profiles/:id", isLoggedIn, (req, res) => {
  Profile.findOne({ _id: req.params.id }).then((data) => {
    console.log("found", data);
    res.render("profileDetail.ejs", { found: data });
  });
});

app.patch("/profiles/:id", isLoggedIn, isOwner, (req, res) => {
  const filter = { _id: req.params.id };
  const update = {
    $set: {
      photo: req.body.photo,
      name: req.body.name,
      location: req.body.location,
      gradyear: req.body.gradyear,
      bio: req.body.bio,
      careerplan: req.body.careerplan,
    },
  };

  Profile.findOneAndUpdate(filter, update, { new: true }).then((up) => {
    res.json(up);
  });
});

app.delete("/profiles/:id", isLoggedIn, isOwner, (req, res) => {
  const filter = { _id: req.params.id };
  Profile.findOneAndDelete(filter).then((up) => {
    res.json(up);
  });
});

//RESOURCES
app.get("/resources", isLoggedIn, (req, res) => {
  Resource.find({}).then((data) => {
    res.render("profile.ejs", { found: data });
  });
});

app.get("/resources/:id", isLoggedIn, (req, res) => {});

app.delete("/resources/:id", (req, res) => {
  const filter = { _id: req.params.id };
  Resource.findOneAndDelete(filter).then((up) => {
    res.json(up);
  });
});

//EVENTS
app.get("/events", isLoggedIn, (req, res) => {
  Event.find({}).then((data) => {
    res.json(data);
  });
});

app.get("/collegeteam", isLoggedIn, (req, res) => {
  const Team = [
    {
      name: "Dennis Pooler",
      photo: "/images/pooler.jpg",
      position: "Managing Director of Post-Secondary Learning",
      bio: "...",
    },
    {
      name: "Andrew Meyers",
      photo: "/images/meyers.jpg",
      position: "Director of College Access",
      bio: `While there is no true pure meritocracy in any place, when it comes to the college process at Comp Sci High, that is the goal.`,
    },
    {
      name: "Sarah Pitari",
      photo: "...",
      position: "Alumni Coordinator",
      bio: "...",
    },
    {
      name: "Quianna McNair",
      photo: "...",
      position: "PSL Teacher/College Counselor",
      bio: "...",
    },
  ];

  res.render("collegeteam.ejs", { users: Team });
  // CollegeTeam.find({})
  //   .then((yes) => {
  //     res.render("collegeteam.ejs",{found: yes});
  // })
});

app.post("/collegeteam", (req, res) => {
  const newCollegeTeam = new CollegeTeam({
    photo: req.body.photo,
    name: req.body.name,
    position: req.body.position,
  });
  newCollegeTeam.save().then((resource) => res.json(resource));
});

//POST

app.post("/resources", (req, res) => {
  const newResource = new Resource({
    attachments: req.body.attachments,
    text: req.body.text,
    profile_id: req.body.profile_id, //automatically logged in if signed in with account
    nameAlumni: req.body.nameAlumni,
  });
  newResource.save().then((resource) => res.json(resource));
});

app.post("/events", (req, res) => {
  const newEvent = new Event({
    attachments: req.body.attachments,
    text: req.body.text,
    start: req.body.start,
    end: req.body.end,
  });
  newEvent.save().then((resource) => res.json(resource));
});

app.use((req, res, next) => {
  res.status(404).send("Not found");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
