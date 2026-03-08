FS Splash screen
=================

We want to create a html pixel-art splash/demo screen akin to the demo plays of old arcades / c64 demo pages. The splash screen consists of a animated background, a title, some scrolling ticker text and an overlay of moving 'sprites'. In terms of z ordering: first background, then sprites, then potentially forground, then the title and finally the ticket text.

All of these splash screens use generated, parameterized/configurable graphics that will be constructed before showing the splash screen (generation can be hidden with fake loading screen). Color palattes, animation scale speed, fonts and so on are all generated from scratch. While we may load static assets such as sprite sheets, the color of these sprites, scale or even composition is created at start up.

The graphics must all be constraint by a render target of 640x480 pixels and a 32 color pallette (this must be configurable if the quality leads to unreadable fonts). Scaling to full screen is done based on this format, without interpolation. If this doesn't fit because the screen black bands can be added at top / bottom, left / right depending on the orientation.

We will define the following different splash screens for the first version. A `galaca` like demo screen (referring to the 1981 shooter), a `sunset` demo showing a Japanese sunset with paralax scrolling (left to right or right to left) mount fuji in the back and a (black) siloutte of a japanese temple in the middle layer and trees in the front layer, the overlay will show cherry blossom boids floating around. A "3d" `cube` demo spinning around with non offensive memes showing on its sides. 

While all graphics are randomly generated, the "theme" must be consistent through out the elements. The theme is defined by choosing a background. Eg we choose a background showing the sunset, the the fonts of the title and ticker text must fit that theme, eg no scifi fonts. 

The title will be some text, but has to be in bold letters fitting the theme. Other properties include configurable properties such as position (it can be oriented in the center, top or bottom), be still or move around. It can have a subtitle or be standalone. The title text will be configurable.

The demo showing is random when the player lands on the page. If the player refreshes the page a new demo is shown that is guaranteed NOT to be the same as the previous demo. 

The code must be in pure JS (ecma 6+) and HTML 5 (canvas) with a simple index.html, _no frameworks_ and as few npm packages as possible (zero being the gold standard). It must run standalone if possible so we don't hit CORS issues (this may change if loading assets is a problem).

