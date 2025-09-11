Bun.serve({
	port: 443,
  	async fetch(req) {
	  const url 	= new URL(req.url)
	  const path 	= url.pathname
	  const paths = path.split('/')
	  
	  const mainPath = paths[1]
	  
	  
	  if(mainPath == "static") {
		//   html = await (await Bun.file("./html" + path)).text();
		  const blob = new Blob([Bun.file("./html" + path)])
		  return new Response(blob)
	  } else {
		  let html = ""
		  html += await Bun.file("./html/public/layout/header.html").text()
	  
		  if(mainPath == "" || mainPath == "home") {
			  html += await Bun.file("./html/public/pages/home/topbg.html").text()
			  html += await Bun.file("./html/public/pages/home/hero.html").text()
			  html += await Bun.file("./html/public/pages/home/swiper.html").text()
			  html += await Bun.file("./html/public/pages/home/intro.html").text()
			  html += await Bun.file("./html/public/pages/home/testimonials.html").text()
			  html += await Bun.file("./html/public/pages/home/benefits.html").text()
			  html += await Bun.file("./html/public/pages/home/pricing.html").text()
			  html += await Bun.file("./html/public/pages/home/startups.html").text()
			  html += await Bun.file("./html/public/pages/home/documentary.html").text()
			  html += await Bun.file("./html/public/pages/home/press.html").text()
			  html += await Bun.file("./html/public/pages/home/board.html").text()
			  html += await Bun.file("./html/public/pages/home/location.html").text()
		  } else if(mainPath == "membership") {
			  html += await Bun.file("./html/public/pages/membership/membership.html").text()
		  } else {
			  html += await Bun.file("./html/public/pages/404/404.html").text()
		  }

		  // FOOTER
		  html += await Bun.file("./html/public/layout/footer.html").text()
		  
		  const blob = new Blob([html], { type: "text/html" })
		  return new Response(blob)
	  }
  	},
  key: Bun.file("./ssl/hackerdojo.org.key"),
  cert: Bun.file("./ssl/hackerdojo.pem")
});

console.log("Server running at: http://hackerdojo.org/")