# Brainstorm — Miro Board Transcription

> **Source:** [Miro board](https://miro.com/app/board/uXjVEOajfEc=/) · transcribed 2026-11-14.
> This is a faithful transcription of the team's brainstorm (69 sticky notes, 66 connectors),
> preserved as the raw input for every other document in `docs/`. Spelling is kept as on the board.
> Do **not** edit this file to reflect new decisions — record those in the PRD or an ADR instead.

## Challenge prompt (SGA Campus Solutions)

> **Smarter Campus Map** (primary prompt; see [Problem Statement](../01-problem-statement.md) for the two integrated prompts). With such a large and multifaceted campus, many valuable spaces, services,
> and opportunities remain difficult for students to discover. Information about buildings, classrooms,
> study spaces, dining, academic resources, and student organizations is often spread across separate
> systems. Even after reaching the correct building, students may struggle to locate specific rooms,
> entrances, labs, offices, or floors. These challenges are especially significant for first-year
> students, transfer students, prospective students, and visitors, while many students also struggle
> to discover organizations that match their interests, academic goals, and career aspirations.
>
> ***How can campus navigation make it easier to discover spaces, resources, and student organizations?***

## Board structure

The board has two trees: **Main Map** (yellow notes — content and data layers) and
**UI / dashboard** (green notes — interaction and features). Indentation follows the arrows.

> ⚠️ The long notes listing desks, offices and makerspaces (locations, hours) have **not been verified**
> against official Georgia Tech sources. Treat them as seed data to be checked (see Risk R-01).


### Main Map

- Layers
  - 3d model of GT
    - Isometric view
      - Street view/possible VR for inernational students to know the campus
        - Greater info of west vs east campus.
    - Clickable buildings
  - Transport
    - Busses
    - Stingerettes
    - Bike parking
    - Walk ways
  - Events
    - Community
    - Clubs
    - Campus Orgs
    - Admin
  - Building Access
    - Open times
    - Buzz card access
  - POI
    - Food
      - Dinning Halls
        - Link to daily menu
        - capacity / daily food review
      - Vending Machines
      - Restaurants
        - Dinning dolars(yes/no)
      - Coffee
    - Exercise
    - Support
      - IT & Tech Support Desks
        > Administrative Services Center (ASC) Tech Support / OIT Walk-Up
        > Location: Clough Undergraduate Learning Commons (CULC), Suite 215 (2nd floor, near Kaldi's Coffee)
        > Details: Primary campus-wide walk-up IT, HR, and financial support desk for students, faculty, and staff (Mon–Fri, 8:00 AM–5:00 PM).
        > Wreck Techs (East Campus)
        > Location: Howell Residence Hall, 1st Floor (Howell Lounge)
        > Details: Walk-up residential network (ResNet) and personal device support for on-campus housing residents (Sun–Thu, 2:00 PM–10:00 PM; Fri, 2:00 PM–6:00 PM).
        > Wreck Techs (West Campus)
        > Location: West Village Dining Commons (1st floor, next to Wreck Stop)
        > Details: Walk-up residential tech and Wi-Fi troubleshooting for West Campus dorms (Sun–Thu, 2:00 PM–10:00 PM; Fri, 2:00 PM–6:00 PM).
        > College of Computing (TSO) Help Desk
        > Location: College of Computing Building (CCB), Room 225D (801 Atlantic Dr NW)
        > Details: Departmental IT and desktop support specifically for College of Computing students, faculty, and staff (Mon–Fri, 8:00 AM–4:00 PM).
        - Housing Community Area Offices
          > ECHO (East Community Housing Office)
          > Location: Field Residence Hall, 711 Techwood Dr NW
          > Hours: Mon–Fri, 8:00 AM–8:00 PM
          > WCHO (West Community Housing Office)
          > Location: Commander Building, 871 McMillan St NW
          > Hours: Mon–Fri, 8:00 AM–8:00 PM
          > NANO (North Avenue Housing Office)
          > Location: North Avenue North Residence Hall, 120 North Ave NW
          > Hours: Mon–Fri, 8:00 AM–10:00 PM
          > GLC / Tenth & Home Area Office
          > Location: Graduate Living Center, 301 10th St NW
          > Hours: Mon–Fri, 8:00 AM–8:00 PM
      - . General Information & Campus Hubs
        > John Lewis Student Center Information Desk
        > Location: John Lewis Student Center, 2nd Floor (351 Ferst Dr NW)
        > Details: Central campus hub for directions, event schedules, day-locker info, lost & found inquiries, and general campus assistance.
        > Georgia Tech Library INFO Desk
        > Location: Price Gilbert Memorial Library, Ground Floor
        > Details: Central service point for library navigation, research assistance, equipment checkout, and the library’s lost & found.
        > Visitor Information & Undergraduate Admissions
        > Location: Bill Moore Student Success Center (219 Uncle Heinie Way)
        > Details: Check-in and information hub for prospective students, campus tours, and general campus visitors.
        > Global Learning Center (GLC) Reception / Info
        > Location: Georgia Tech Global Learning Center (84 5th St NW, Tech Square)
        > Details: Front desk support for Tech Square visitors, conference attendees, and Georgia Tech Professional Education (GTPE) students.
      - Safety, Transit & Financial Desks
        > Georgia Tech Police Department (GTPD) Front Lobby
        > Location: 965 Hemphill Ave NW
        > Hours: Open 24/7
        > Parking and Transportation Services (PTS)
        > Location: 770 Spring St NW (Ground Level of Tech Square/GT Hotel Parking Deck)
        > Hours: Mon–Fri, 8:00 AM–4:00 PM
        > Office of the Bursar (Walk-Up Window)
        > Location: Lyman Hall, Suite 111 (225 North Ave NW)
        > Hours: Mon–Fri, 9:00 AM–4:00 PM
    - Makerspace & Innovation Hubs
      - The Hive Makerspace (Interdisciplinary Design Commons) – 777 Atlantic Dr NW, Atlanta, GA
        > Focus: The nation's largest electronics-oriented student makerspace, featuring solder stations, oscilloscopes, and 3D printers. [1, 2]
        > The Flowers Invention Studio – 801 Ferst Dr, Atlanta, GA
        > Focus: An award-winning, student-run open-access prototyping facility equipped with laser cutters, CNC machines, woodworking tools, and 3D printers. [1, 2]
        > The Yang Aero Maker Space – Georgia Tech College of Engineering
        > Focus: Aerospace engineering prototyping, woodworking, metalworking, and composite shops. [1]
        > The BME Design Shop – Georgia Tech College of Engineering
        > Focus: Bioengineering facility equipped with 3D printers, lathes, and mills. [1]
        > The MILL – Georgia Tech College of Engineering
        > Focus: Materials creation, measurement, and testing lab with 3D printers and an electron microscope. [1]
        > AI Makerspace – Georgia Tech College of Engineering
        > Focus: An NVIDIA-collaborating supercomputer hub providing advanced AI computing resources. [1]
        > Allen-Davidson-Coleman XR Makerspace – Georgia Tech
        > Focus: High-performance computing facility blending physical and virtual realities with VR
  - Heat map of campus activity
    - Made similar o how waze makes trafic.
      - Two elements
        - Video stories (inspired in snapchat click to see whats going on)
        - One for study spots

### UI / dashboard

- In map
  - Toggle/key for layers
  - POI key/filter
  - Study spaces/ density
    - General study spaces where students are able to rate how full a space is and after data collection complete with a model
  - Tabs
    - Stories/feed
      - If an interestig story comes up, you should be able to click it and see where in the map its happening.
    - Bulletin Board where community, clubs, orgs, admin can post/advertise
    - reserve a room
      - shows you floor plan of where the room is and highlights it
      - Also system to reserve a locker
    - Maintinance Form / report something
      - Status of requests and pools different requests from same incident. Filter of what type of maintinance ticket.
- In building
  - Per building if clicked (first click hilights and pops up tab with picture, second gets you here) or NFC tag inside building
    - Gives you basically a directory like inside a mall with classrooms, study rooms, offices, bathrooms, vending machines, lockers, etc.
    - Selected classroom or whatever shows a path.
    - breakdown per level. basically using the floor plans.
