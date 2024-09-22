const dotenv = require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Use an async function for the main script execution
(async () => {
  // Launch a browser session in non-headless mode (visible) with maximized window
  const browser = await puppeteer.launch({ headless: false, args: ["--start-maximized"] });
  const page = await browser.newPage();

  // Retrieve screen dimensions from the page
  const screen = await page.evaluate(() => ({
    width: window.screen.width,
    height: window.screen.height,
  }));

  // Set the browser viewport to match the full screen size
  await page.setViewport({
    width: screen.width,
    height: screen.height,
  });

  // Navigate to the login page of the target site
  await page.goto("https://apollo.lereacteur.io/");

  // Wait for the email input field to load, then type the email from environment variables
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', process.env.EMAIL);

  // Wait for the password field, type the password from environment variables, and click the login button
  await page.waitForSelector('input[name="password"]');
  await page.type('input[name="password"]', process.env.PW);
  await page.click("button.zenstyle-16r8c7u");

  // Wait for and click a specific course link after logging in
  await page.waitForSelector("a.zenstyle-shm7tl");
  await page.click("a.zenstyle-shm7tl");

  // Function to click all SVG child elements within a specific div class
  async function clickOnSvgIcons() {
    await page.waitForSelector("div.zenstyle-8lyrwn"); // Wait for the parent div to load
    const svgs = await page.$$("div.zenstyle-8lyrwn svg.zenstyle-13jaz8d"); // Select SVG elements

    // Loop through and click each SVG element
    for (const svg of svgs) {
      await svg.click();
    }
  }

  // Call the function to click the SVG icons
  await clickOnSvgIcons();

  // Function to click all SVG elements within specific divs, skipping the first SVG of each div
  async function clickOnAllSvgInAllSpecificDivs() {
    await page.waitForSelector("div.zenstyle-1d785g7"); // Wait for the divs to load
    const allDivs = await page.$$("div.zenstyle-1d785g7"); // Select all divs with a specific class

    // Loop through each div and its child SVGs
    for (const div of allDivs) {
      const svgs = await div.$$("svg"); // Select all SVGs in the current div

      // Loop through all SVGs, starting from the second one (index 1)
      for (let i = 1; i < svgs.length; i++) {
        const svg = svgs[i];
        try {
          // Check if the SVG is still attached to the DOM, then click it
          const isConnected = await page.evaluate((element) => element.isConnected, svg);
          if (isConnected) {
            await svg.scrollIntoViewIfNeeded(); // Scroll to the SVG if necessary
            await svg.click(); // Click the SVG
          } else {
            console.log("SVG detached from the document, moving to the next.");
          }
        } catch (error) {
          console.log("Error while clicking an SVG: ", error);
        }
      }
    }
  }

  // Call the function to click all SVGs in specific divs
  await clickOnAllSvgInAllSpecificDivs();

  // Select SVG elements from parent divs containing the text "Semaine" and store their HTML
  const svgElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("div.zenstyle-1o4t05n")) // Select parent divs
      .filter((el) => el.innerText.includes("Semaine")) // Filter divs by inner text
      .map((el) => el.parentElement) // Get parent elements
      .map((parent) => Array.from(parent.querySelectorAll("svg")).slice(1)) // Select child SVGs, skip the first
      .flat() // Flatten the array of SVGs
      .map((svg) => svg.outerHTML); // Return outerHTML of each SVG
  });

  // Loop through and click each SVG based on its outerHTML
  for (const svg of svgElements) {
    await page.evaluate((svgHTML) => {
      const svgElement = Array.from(document.querySelectorAll("svg")).find((el) => el.outerHTML === svgHTML); // Find matching SVG
      if (svgElement) {
        const event = new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        svgElement.dispatchEvent(event); // Simulate a click event
      }
    }, svg);
  }

  // Function to get all <a> links inside a specific div
  async function getAllLinksFromParentDiv() {
    await page.waitForSelector("div.zenstyle-8lyrwn"); // Wait for the div to load
    const links = await page.$$eval("div.zenstyle-8lyrwn a", (anchors) => anchors.map((anchor) => anchor.href)); // Get all hrefs
    return links; // Return the list of links
  }

  // Function to create a folder 'extract' if it doesn't exist
  async function createExtractFolder() {
    const dir = path.join(__dirname, "extract");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir); // Create the directory if it doesn't exist
    }
  }

  async function downloadVideo(videoUrl, outputPath, referer) {
    const response = await axios({
      method: "GET",
      url: videoUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        "Referer": referer,
        "Accept": "video/webm, video/mp4, application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  }

  // Mettre à jour checkForIframeAndDownload
  async function checkForIframeAndDownload() {
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("iframe");
      return iframe ? iframe.src : null;
    });

    if (iframeSrc) {
      console.log("Found iframe with src: ${iframeSrc}");
      const videoPath = path.join(__dirname, "extract", "video.mp4"); // Change le nom si nécessaire

      try {
        await downloadVideo(iframeSrc, videoPath);
        console.log(`Video downloaded: ${videoPath}`);
      } catch (error) {
        console.error(`Error downloading video: ${error.message}`);
      }
    }
  }

  async function capturePdfFromLinks(links) {
    for (const link of links) {
      try {
        await page.goto(link);
        await page.waitForSelector("#loader-1", { hidden: true });

        await checkForIframeAndDownload();

        const title = await page.title();
        const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "document"; // Titre par défaut

        const pdfPath = path.join(__dirname, "extract", `${safeTitle}.pdf`);

        await page.pdf({
          path: pdfPath,
          format: "A4",
          printBackground: true,
          margin: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px",
          },
          fullPage: true,
        });

        console.log(`PDF created for: ${safeTitle}`);
      } catch (error) {
        console.log(`Error generating PDF for ${link}:`, error);
      }
    }
  }

  const allLinks = await getAllLinksFromParentDiv(); // get all links from sidebar
  await capturePdfFromLinks(allLinks); // Capture PDFs from links
})();
