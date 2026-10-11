/*
 * Taggo tag database.
 *
 * Each NFC tag is programmed with https://hackerdojo.org/taggo?id={id}.
 * The key below is that {id}. The "type" field selects which page layout
 * is rendered; the remaining fields are specific to that type.
 *
 * Supported types (see renderers in taggo/index.html):
 *
 *   room    - title, description, image, details: { capacity, desks,
 *             squareFeet, ratePerDesk, monthlyRate, annualRate },
 *             amenities: [], action: { label, url }
 *   tool    - title, location, description, image, steps: [],
 *             safety: [], links: [{ label, url }]
 *   donate  - title, event, amount, description, url, buttonLabel
 *   info    - title, description, image, sections: [{ heading, body }],
 *             links: [{ label, url }]
 *
 * Every type also accepts an optional "subtitle". Any field may be omitted.
 * NOTE: the example values below are placeholders - replace with real data.
 */
window.TAGGO_TAGS = {
  "Andromeda": {
    title:"Andromeda",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Kirk", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Bode's": {
    title: "Bode's",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Spock", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
	},

	"Cartwheel": {
    title: "Cartwheel",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Bones", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Dwarf": {
    title: "Dwarf",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Checkov", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

	"Eye of Sauron": {
    title: "Eye of Sauron",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
		amenities: [],
    reservedBy: "Sulu", // some string of someone or company.
		action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
	},

  "Fireworks": {
    type: "room",
    description: "This room is designated as an office space", 
    title: "Fireworks",
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Uhuru", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Grand Design": {
    title: "Grand Design",

    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Scotty", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Hoag's Object": {
    type: "room",
    description: "This room is designated as an office space", 
    title: "Hoag's Object",
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Janeway", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Integral Sign": {
    title: "Integral Sign",
    type: "room",
    description: "This room is designated as an office space", 
    location:"",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Picard", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Jellyfish": {
    title: "Jellyfish",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Data", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Knife Edge": {
    title: "Knife Edge",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Louis", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Lopsided": {
    title: "Lopsided",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "La Forge", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Malin 1": {
    title: "Malin 1",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Q", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },

  "Needle": {
    title: "Needle",
    type: "room",
    description: "This room is designated as an office space", 
    location: "",
    capacity: 5,
    size: [12,12],
    monthlyRate: 1095,
    amenities: [],
    reservedBy: "Saavik", // some string of someone or company.
    action: { label: "Inquire about this room", url: "mailto:info@hackerdojo.org?subject=Conference%20Room%20A" }
  },
  
	"Green Coffee Machine": {
    type: "tool",
    title: "Espresso Machine",
    location: "Main kitchen, next to the sink",
    description: "Members are welcome to use the espresso machine. Please clean up after yourself.",
    steps: [
      "Make sure the water tank is filled.",
      "Turn the machine on and wait for the ready light (about 2 minutes).",
      "Grind beans and tamp into the portafilter.",
      "Lock in the portafilter, place a cup, and press the single or double shot button.",
      "Knock out the puck into the compost bin and rinse the portafilter."
    ],
    safety: ["The steam wand is very hot.", "Report problems in #facilities on Slack."],
    links: []
  },

  "3D Printer 1": {
    type: "tool",
    title: "3D Printer #1",
    location: "Prototype Lab",
    description: "Fused filament 3D printer available to members who have completed the orientation.",
    steps: [
      "Check the bed is clean and empty.",
      "Load your sliced file from the SD card or USB.",
      "Watch the first layer to make sure it adheres.",
      "Remove your print once the bed has cooled.",
      "Log your print using the print log form."
    ],
    safety: ["Do not touch the nozzle or heated bed.", "Do not leave long prints unattended without checking in."],
    links: [
      { label: "Print log form", url: "https://forms.gle/REPLACE_ME" }
    ]
  },

  "Donate 25": {
    type: "donate",
    title: "Donate $25",
    event: "General Support",
    amount: 25,
    description: "Hacker Dojo is a nonprofit run by its community. Your donation keeps the lights on and the doors open.",
    url: "https://fundrazr.com/52kkYb?ref=sh_2F3E51_ab_0XDyBWOLHcp0XDyBWOLHcp",
    buttonLabel: "Donate now"
  },

  "Wifi": {
    type: "info",
    title: "Wi-Fi & Getting Connected",
    subtitle: "Welcome to Hacker Dojo",
    description: "Here is how to get online and find your way around.",
    sections: [
      { heading: "Wi-Fi", body: "Connect to the member network. Ask the front desk for the current password." },
      { heading: "Need help?", body: "Ask in the #general channel on Slack or find a volunteer at the front desk." }
    ],
    links: [
      { label: "Become a member", url: "https://hackerdojo.spaces.nexudus.com/?public&" }
    ]
  }
};
