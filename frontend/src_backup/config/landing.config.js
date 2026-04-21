export const landingConfig = {
  branding: {
    logo: "/assets/logo.svg",
    nameKey: "app.name",
    taglineKey: "app.tagline"
  },

  contact: {
    phones: ["+91 89711 24659", "+91 77430 48757"],
    email: "andreas@mahimaministries.com",
    address:
      "Universal Public School, Gurunanak Nagar, Gulab Devi Road, Jalandhar, Punjab"
  },

  hero: {
    enabled: true,
    backgroundImage: "/assets/mahimachurch-hero.jpg",
    fallbackImage:
      "https://images.unsplash.com/photo-1502791451860-3f88b3e74f66",
    poster: {
      primary: "/glory-to-grace.jpg",
      fallback: "/assets/glory-to-grace.jpg"
    },
    ctas: [
      { type: "sermons", icon: "Play", labelKey: "hero.watchSermons" },
      { type: "groups", icon: "Users", labelKey: "hero.joinGroup" },
      { type: "prayer", icon: "MessageSquare", labelKey: "hero.requestPrayer" }
    ]
  },

  sections: [
    { id: "hero", enabled: true },
    { id: "quickActions", enabled: true },
    { id: "about", enabled: true },
    { id: "ministries", enabled: true },
    { id: "values", enabled: true },
    { id: "getInvolved", enabled: true }
  ],

  ministries: [
    {
      title: "Worship & Services",
      desc: "Biblical teaching and worship.",
      icon: "Play"
    },
    {
      title: "Healing Ministry",
      desc: "Prayer, deliverance & counseling.",
      icon: "Heart"
    },
    {
      title: "Children & Youth",
      desc: "Safe, fun discipleship programs.",
      icon: "Users"
    }
  ]
};
