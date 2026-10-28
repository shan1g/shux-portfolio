export type ProjectChapter = {
  label: "Challenge" | "Approach" | "Outcome";
  body: string;
};

export type Project = {
  title: string;
  client: string;
  /** Lead copy, taken from the Behance project text where it was retrievable. */
  description: string;
  href: string;
  tags: string[];
  source?: "behance" | "github";
  image?: string;
  /** Case-study chapters. Only chapters with real project copy are listed. */
  chapters?: ProjectChapter[];
  /** Short results lines shown under the credits, like A24's review quotes. */
  highlights?: string[];
};

// Copy below comes from each project's Behance text, retrieved through search
// excerpts because Behance returns 403 to direct fetches. Projects without
// retrievable chapter copy list only their lead. Nothing has been invented.
export const projects: Project[] = [
  {
    title: "Cadbury — Hide them with Love Mzansi",
    client: "Cadbury",
    description:
      "Cadbury's “Hide Them With Love, Mzansi” campaign turned a simple Easter egg hide into a nationwide movement of digital storytelling and heartfelt giving.",
    href: "https://www.behance.net/gallery/231321479/Cadbury-Hide-them-with-Love-Mzansi",
    tags: ["Campaign", "CRM", "Interactive"],
    source: "behance",
    image: "/work/cadbury-hide.png",
    chapters: [
      {
        label: "Challenge",
        body: "In a digital-first world, where South Africans spend over 10 hours online daily (WeAreSocial, 2024), the challenge was clear: how do we create moments of real connection in an increasingly disconnected landscape?",
      },
      {
        label: "Outcome",
        body: "Over 4,400% higher participation rate than the industry average (0.7% average; Source: Statista). 7x higher click-through rate than the display ad industry average (0.35% average; Source: Clever Ads). 2.5x higher visitor count than expected, with an average of 2,000 visitors each day of the campaign.",
      },
    ],
    highlights: [
      "4,400% higher participation than the industry average",
      "7x the display-ad click-through average",
    ],
  },
  {
    title: "KFC — Block Booked",
    client: "KFC",
    description:
      "KFC Block Booked is a clever digital campaign designed to help South Africans reclaim their lunch hour while boosting KFC's midday sales.",
    href: "https://www.behance.net/gallery/220789611/KFC-Block-Booked",
    tags: ["Campaign", "Social", "Mobile"],
    source: "behance",
    image: "/work/kfc-block-booked.jpg",
    chapters: [
      {
        label: "Challenge",
        body: "Desk dining has become the norm, stealing away the one hour that rightfully belongs to us.",
      },
      {
        label: "Approach",
        body: "By turning meeting invites into an e-commerce opportunity, the campaign allowed users to schedule humorous, pre-filled calendar events disguised as “meetings” with matching KFC meal suggestions. Through a browser-based platform, customers could book their lunch break, receive discount vouchers, and spark a broader conversation about work-life balance.",
      },
      {
        label: "Outcome",
        body: "With over 16 million in reach, the campaign successfully increased lunchtime sales and helped reclaim over 79,000 hours of lunch across the country.",
      },
    ],
    highlights: ["16 million+ reach", "79,000+ hours of lunch reclaimed"],
  },
  {
    title: "Colgate — Beyond the Cookie CRM",
    client: "Colgate",
    // Behance copy could not be retrieved (403, no search excerpt). This lead
    // is the original site copy, not Behance copy. Replace it once available.
    description:
      "Personalised CRM flows that go past one-size-fits-all messaging — tailoring oral-care journeys to real user behaviour and context.",
    href: "https://www.behance.net/gallery/173870519/Colgate-Beyond-the-cookie-CRM",
    tags: ["CRM", "Personalisation", "Web"],
    source: "behance",
    image: "/work/colgate-crm.png",
  },
  {
    title: "Anglo American — Mining Indaba Metavention",
    client: "Anglo American",
    // Only the Behance intro was retrievable; challenge/approach copy pending.
    description:
      "The Investing in African Mining Indaba is the world's largest mining investment convention, dedicated to the capitalisation and development of mining in Africa.",
    href: "https://www.behance.net/gallery/149507247/Anglo-American-Mining-Indaba-Metavention",
    tags: ["Metaverse", "3D", "Event"],
    source: "behance",
    image: "/work/anglo-indaba.png",
  },
  {
    title: "Citizens Bank — Living Portrait of NYC",
    client: "Citizens",
    description:
      "Citizens commissioned a multimedia, multi-sensory exhibition to celebrate the unique elements that make New York, New York.",
    href: "https://www.behance.net/gallery/164782513/Citizens-The-Living-Portrait-of-NYC",
    tags: ["Data viz", "Web", "Storytelling"],
    source: "behance",
    image: "/work/citizens-nyc.png",
    chapters: [
      {
        label: "Challenge",
        body: "What does it mean to be a New Yorker? Set Reset were tasked with creating the Data Portrait - an immersive large format animation exploring the data behind life in the Big Apple.",
      },
      {
        label: "Approach",
        body: "With the city grid as inspiration, we created a toolkit of geometric forms that could be multiplied and extrapolated as the story required, using a mixture of traditional visualisation and playful illustration. Three touchscreen kiosks provided opportunities for people to respond to the data through an interactive quiz.",
      },
      {
        label: "Outcome",
        body: "The Living Portrait of NYC exhibition ran from 18—27 September 2022 at Iron23, 29 W 23rd St, New York City. Awards: D&AD Graphite Pencil: Data Visualisation.",
      },
    ],
    highlights: ["D&AD Graphite Pencil: Data Visualisation"],
  },
  {
    title: "Audi Driving Experience Booking Platform",
    client: "Audi",
    // Only the Behance intro was retrievable; challenge/outcome copy pending.
    description:
      "The Audi Advanced Driving Experience project involved creating a sleek and efficient booking platform inspired by modern German design principles, particularly the Bauhaus style.",
    href: "https://www.behance.net/gallery/200219955/Audi-Driving-Experience-Booking-Platform",
    tags: ["Booking", "UX", "Platform"],
    source: "behance",
    image: "/work/audi-driving.jpg",
  },
  {
    title: "Cadbury — GeneroCity Map",
    client: "Cadbury",
    description:
      "Aimed to rejuvenate the spirit of giving during the festive season by transforming expressions of gratitude into visible, impactful acts of generosity across South Africa.",
    href: "https://www.behance.net/gallery/212213423/Cadbury-GeneroCity-Map",
    tags: ["Map", "Community", "Campaign"],
    source: "behance",
    image: "/work/cadbury-generocity.jpg",
    chapters: [
      {
        label: "Challenge",
        body: "According to the Charities Aid Foundation (CAF) 2022 World Giving Index, the nation's global generosity ranking has dropped since 2021.",
      },
      {
        label: "Approach",
        body: "The campaign strategically encouraged people to share personalised thank-you messages, showcasing them on a dynamic map that visualised these acts in real time, fostering a sense of collective participation and social pride.",
      },
    ],
  },
  {
    title: "KeyboardLearner",
    client: "Side project",
    description:
      "Turn keyboard mashing into something fun to learn — built for curious kids and patient parents.",
    href: "https://keyboard-learner.vercel.app/",
    tags: ["TypeScript", "Education", "Side project"],
    source: "github",
    image: "/work/keyboard-learner.jpg",
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
