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

// Copy below comes from each project's Behance text. Behance returns 403 to
// direct fetches, so it was retrieved from the profile's RSS feed, Wayback
// Machine captures and search excerpts. Projects without retrievable chapter
// copy list only their lead. Nothing has been invented.
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
    description:
      "First-party data (1PD) is becoming a rare commodity as we shift towards a cookieless world.",
    href: "https://www.behance.net/gallery/173870519/Colgate-Beyond-the-cookie-CRM",
    tags: ["CRM", "Personalisation", "Web"],
    source: "behance",
    image: "/work/colgate-crm.png",
    chapters: [
      {
        label: "Challenge",
        body: "Colgate-Palmolive needed to create a lucrative global mine that would harvest consumer data. It also needed to create long-term engagement through personalised communications. Our task was to build a CRM system that supported multiple nuanced markets, as well as being able to adapt to individuals.",
      },
      {
        label: "Approach",
        body: "We created a CRM system that can scale into a personalised loyalty program over time. To achieve this, we adopted a phased approach to gain consumer data incrementally. Phase 1 uses a data-driven onboarding experience to collect 1PD. This is the point where Colgate Oral Care and its customers establish a relationship through personalised communications.",
      },
    ],
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
    title: "Citizens Bank — Living Portrait of NYC Website",
    client: "Citizens Bank",
    description:
      "Our NY office had created a wonderfully immersive NYC launch experience for Citizens Bank.",
    href: "https://www.behance.net/gallery/188012917/Citizens-Bank-The-Living-Portrait-of-NYC-Website",
    tags: ["Web", "Registration", "Campaign"],
    source: "behance",
    image: "/work/citizens-website.png",
    chapters: [
      {
        label: "Challenge",
        // The Behance feed shows "?" where the dash is; restored as an em dash.
        body: "“The Living Portrait of NYC” was an immersive, multi-sensory live in-person experience that ran for about 2 weeks. All promotions/advertising drove to a website where people can register for free to get a ticket. The site was a crucial centerpiece to their campaign — if people didn't register, they wouldn't come. Our South African team was tasked to bring this part of the full experience to life.",
      },
    ],
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
    title: "Promise — Digital Positioning",
    client: "Promise",
    description: "Repositioning the Promise brand within the digital environment.",
    href: "https://www.behance.net/gallery/54255749/Promise-Digital-Positioning",
    tags: ["Brand", "Digital", "Positioning"],
    source: "behance",
    image: "/work/promise-positioning.png",
  },
  {
    title: "KFC — Do you Speak Emoji? Challenge",
    client: "KFC",
    description:
      "The “Do You Speak Emoji?” campaign by KFC South Africa was an innovative initiative celebrating World Emoji Day by engaging audiences through the universal language of emojis.",
    href: "https://www.behance.net/gallery/212668425/KFC-Do-you-Speak-Emoji-Challenge",
    tags: ["Campaign", "WhatsApp", "AI"],
    source: "behance",
    image: "/work/kfc-emoji.png",
    chapters: [
      {
        label: "Approach",
        body: "Integrating technology and humour, the campaign featured an AI-powered Emoji Translator on WhatsApp, allowing users to convert texts to emojis and vice versa with a KFC twist. It leveraged social media to amplify reach and incentivised participation with prizes, including KFC vouchers.",
      },
      {
        label: "Outcome",
        body: "With over 9.74 million impressions and thousands of interactions, the campaign showcased KFC's creativity and technological savvy while connecting with a digitally engaged audience in a playful, memorable way.",
      },
    ],
    highlights: ["9.74 million+ impressions"],
  },
  {
    title: "Colgate — Personalise Your Smile CRM",
    client: "Colgate",
    description:
      "In an effort to deepen customer relationships and enhance engagement, Colgate-Palmolive launched a personalised CRM campaign centred around turning their toothpaste into a loyal, trustworthy friend.",
    href: "https://www.behance.net/gallery/202685907/Colgate-Personalise-Your-Smile-CRM",
    tags: ["CRM", "Email", "Salesforce"],
    source: "behance",
    image: "/work/colgate-smile.png",
    chapters: [
      {
        label: "Approach",
        body: "The project began with a phased approach to understanding individual oral healthcare concerns through in-mail interaction surveys, allowing for the collection of data to create customised healthcare programs. By segmenting users into tailored journeys, the campaign ensured that onboarding, profiling, and personalised email communications were relevant and timely, building a strong connection with each customer. To support this personalised approach, we developed living blueprints to manage and distribute all content options efficiently, feeding into Salesforce for seamless integration. Each email was crafted with consumer-relevant content, including tips, tricks, and product recommendations, fostering a non-intrusive, personalised experience.",
      },
    ],
  },
  {
    title: "Cadbury — Homegrown Stories Collection",
    client: "Cadbury",
    description:
      "Our campaign leveraged innovative mobile voice-to-text and voice note technology to make storytelling engaging and accessible to children.",
    href: "https://www.behance.net/gallery/188848409/Cadbury-Homegrown-Stories-Collection",
    tags: ["Campaign", "Voice", "Mobile"],
    source: "behance",
    image: "/work/cadbury-homegrown.png",
    chapters: [
      {
        label: "Challenge",
        body: "South Africa's history has negatively impacted our youth, with 31% of primary school children being illiterate. Moreover, only 2% of children's literature is available in languages other than English and Afrikaans, limiting access to culturally relevant stories.",
      },
      {
        label: "Approach",
        body: "By turning ordinary people into published authors, we not only enhanced our brand's meaning but also improved reading comprehension, proving that there's a “Glass & A Half” in everyone.",
      },
    ],
  },
  {
    title: "Bestmed — Making Bestmed Better",
    client: "Bestmed",
    // The Behance feed cuts this lead off after its first sentence; only that
    // complete sentence is used.
    description:
      "Bestmed have been providing quality healthcare to South Africans since 1964, boasting the most loyal customers at 70.6% (above industry par of 68.8%).",
    href: "https://www.behance.net/gallery/153939793/Making-Bestmed-Better",
    tags: ["UX", "Web", "Healthcare"],
    source: "behance",
    image: "/work/bestmed.png",
  },
  {
    title: "Livinguard — Optimisation & Governance",
    client: "Livinguard",
    description:
      "Livinguard is an innovative brand selling premium personal protective wearables geared toward changing people's lives.",
    href: "https://www.behance.net/gallery/173411725/Livinguard-Optimisation-Governance",
    tags: ["eCommerce", "Audit", "Web"],
    source: "behance",
    image: "/work/livinguard.jpg",
    chapters: [
      {
        label: "Challenge",
        body: "But their eCommerce presence failed to deliver this message. So we were tasked to audit it, make recommendations and then implement them.",
      },
      {
        label: "Approach",
        body: "Our plan was to create a coherent structure and consistent brand identity throughout the site.",
      },
    ],
  },
  {
    title: "MMA SMARTIES — The Host-age Situation",
    client: "MMA SMARTIES",
    description:
      "The MMA SMARTIES honours the most effective modern marketing in South Africa.",
    href: "https://www.behance.net/gallery/134407621/The-Host-age-Situation",
    tags: ["Campaign", "Awards", "Digital"],
    source: "behance",
    image: "/work/hostage-situation.png",
    chapters: [
      {
        label: "Challenge",
        body: "There wasn’t much time (+/- 10 days), nor a budget (+/- R 30k) to emphasize the fact that the awards were free to enter. We needed a simple digital idea that promoted excellence in a digital ecosystem.",
      },
      {
        label: "Approach",
        body: "So we decided to have heavy-weight CEO and CMO prospects (Our judging panel) hold the website domains of their creative agency counterparts for ransom until they entered the awards. A HOST-age situation... if you will.",
      },
    ],
  },
  {
    title: "Social.Lab — Experience Design",
    client: "Social.Lab",
    // No Behance description could be retrieved; the lead is the project's
    // Behance title. Replace it once the copy is available.
    description: "Experience Design.",
    href: "https://www.behance.net/gallery/137291811/SocialLab-Experience-Design",
    tags: ["Experience design"],
    source: "behance",
    image: "/work/social-lab.png",
  },
  {
    title: "Jabari — “Own it” Campaign",
    client: "Jabari",
    // Behance's archived page cuts this lead off ("Read More"); the real text
    // is used up to the cut. Replace it once the full copy is available.
    description:
      "In order to appeal to young and creative hip-hop head audience, we created a platform for them to participate in the production and amplification…",
    href: "https://www.behance.net/gallery/59750565/Jabaris-Own-it-Campaign",
    tags: ["Music", "Hip hop", "UGC"],
    source: "behance",
    image: "/work/jabari-own-it.png",
  },
  {
    title: "Renault — New Megane Digital Launch",
    client: "Renault",
    // Behance has only this line; the rest of the project is image captions.
    description: "Digital launch campaign for the New RENAULT Megane.",
    href: "https://www.behance.net/gallery/49861215/DIGITAL-LAUNCH-CAMPAIGN-New-RENAULT-Megane",
    tags: ["Web design", "Web development", "Art direction"],
    source: "behance",
    image: "/work/renault-megane.jpg",
  },
  {
    title: "KeyboardLearner",
    client: "Side project",
    description:
      "Turn keyboard mashing into something fun to learn — built for curious kids and patient parents.",
    href: "https://keyboard-learner.vercel.app/",
    tags: ["TypeScript", "Education", "Side project"],
    source: "github",
    image: "/work/keyboard-learner.png",
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
    title: "Front-end engineering",
    body: "Component-driven builds in JavaScript, TypeScript, Next.js and Vue — structured so the next developer can pick them up without a tour.",
  },
  {
    index: "02",
    title: "Campaign platforms",
    body: "Launch-grade builds with CMS, CRM and API integrations that hold up under traffic spikes and last-minute scope changes.",
  },
  {
    index: "03",
    title: "Motion systems",
    body: "Timing, easing, and choreography built as a system rather than a pile of one-off animations.",
  },
  {
    index: "04",
    title: "Accessibility & performance",
    body: "Semantic markup, keyboard and screen-reader support, and real performance budgets checked before launch, not after.",
  },
  {
    index: "05",
    title: "Real-time graphics",
    body: "WebGL, WebGPU and canvas work used with intent — immersive atmosphere and depth that still degrade cleanly everywhere else.",
  },
];

export const siteLinks = {
  github: "https://github.com/shan1g",
  behance: "https://www.behance.net/shan1g",
  linkedin: "https://www.linkedin.com/in/shan-gray-970a582a/",
  x: "https://x.com/shan1g",
};

export const navItems = [
  { label: "Work", href: "#work" },
  { label: "Skills", href: "#skills" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];
