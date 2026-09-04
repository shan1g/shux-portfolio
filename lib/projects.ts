export type Project = {
  title: string;
  description: string;
  href: string;
  tags: string[];
  source?: "behance" | "github";
  image?: string;
};

export const projects: Project[] = [
  {
    title: "Cadbury — Hide them with Love Mzansi",
    description:
      "A digital Easter campaign that turned generosity into a nationwide movement — interactive storytelling with participation rates far above industry norms.",
    href: "https://www.behance.net/gallery/231321479/Cadbury-Hide-them-with-Love-Mzansi",
    tags: ["Campaign", "CRM", "Interactive"],
    source: "behance",
    image: "/work/cadbury-hide.png",
  },
  {
    title: "KFC — Block Booked",
    description:
      "Reclaiming the lunch hour through clever calendar invites — a browser platform that disguised meal breaks as meetings and drove midday sales.",
    href: "https://www.behance.net/gallery/220789611/KFC-Block-Booked",
    tags: ["Campaign", "Social", "Mobile"],
    source: "behance",
    image: "/work/kfc-block-booked.jpg",
  },
  {
    title: "Colgate — Beyond the Cookie CRM",
    description:
      "Personalised CRM flows that go past one-size-fits-all messaging — tailoring oral-care journeys to real user behaviour and context.",
    href: "https://www.behance.net/gallery/173870519/Colgate-Beyond-the-cookie-CRM",
    tags: ["CRM", "Personalisation", "Web"],
    source: "behance",
    image: "/work/colgate-crm.png",
  },
  {
    title: "Anglo American — Mining Indaba Metavention",
    description:
      "An immersive metaverse experience for Mining Indaba — bridging physical event presence with a digital layer attendees could explore.",
    href: "https://www.behance.net/gallery/149507247/Anglo-American-Mining-Indaba-Metavention",
    tags: ["Metaverse", "3D", "Event"],
    source: "behance",
    image: "/work/anglo-indaba.png",
  },
  {
    title: "Citizens Bank — Living Portrait of NYC",
    description:
      "A large-format data portrait exhibition — bold visualisations and interactive kiosks that made New York life tangible and participatory.",
    href: "https://www.behance.net/gallery/164782513/Citizens-The-Living-Portrait-of-NYC",
    tags: ["Data viz", "Web", "Storytelling"],
    source: "behance",
    image: "/work/citizens-nyc.png",
  },
  {
    title: "Audi Driving Experience Booking Platform",
    description:
      "A booking platform for Audi's driving experiences — clear flows, confident UI, and a premium feel that matches the brand on every screen.",
    href: "https://www.behance.net/gallery/200219955/Audi-Driving-Experience-Booking-Platform",
    tags: ["Booking", "UX", "Platform"],
    source: "behance",
    image: "/work/audi-driving.jpg",
  },
  {
    title: "Cadbury — GeneroCity Map",
    description:
      "A live generosity map that visualised thank-you messages across South Africa — turning gratitude into a shared, festive community moment.",
    href: "https://www.behance.net/gallery/212213423/Cadbury-GeneroCity-Map",
    tags: ["Map", "Community", "Campaign"],
    source: "behance",
    image: "/work/cadbury-generocity.jpg",
  },
  {
    title: "KeyboardLearner",
    description:
      "Turn keyboard mashing into something fun to learn — built for curious kids and patient parents.",
    href: "https://github.com/shan1g/KeyboardLearner",
    tags: ["TypeScript", "Education", "Side project"],
    source: "github",
  },
];

export type Capability = {
  index: string;
  title: string;
  body: string;
};

export const capabilities: Capability[] = [
  {
    index: "01",
    title: "Interaction design",
    body: "Flows, states, and edge cases mapped before a pixel is drawn — so the build has nothing left to guess.",
  },
  {
    index: "02",
    title: "Front-end craft",
    body: "Responsive interfaces with real performance budgets, semantic structure, and implementation that survives handover.",
  },
  {
    index: "03",
    title: "Motion systems",
    body: "Timing, easing, and choreography built as a system rather than a pile of one-off animations.",
  },
  {
    index: "04",
    title: "Campaign platforms",
    body: "Launch-grade builds that hold up under traffic spikes, CRM integrations, and last-minute scope changes.",
  },
  {
    index: "05",
    title: "Real-time graphics",
    body: "WebGPU and canvas work used with intent — atmosphere and depth that still degrade cleanly everywhere else.",
  },
];

export const siteLinks = {
  github: "https://github.com/shan1g",
  behance: "https://www.behance.net/shan1g",
  linkedin: "https://www.linkedin.com/in/shan-gray-970a582a/",
  x: "https://x.com/shan1g",
};

export const navItems = [
  { label: "About", href: "#about" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Work", href: "#work" },
  { label: "Contact", href: "#contact" },
];
