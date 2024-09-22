const dotenv = require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  // Lancer une session de navigateur
  const browser = await puppeteer.launch({ headless: false, args: ["--start-maximized"] });
  const page = await browser.newPage();

  // Récupérer la taille de l'écran
  const screen = await page.evaluate(() => ({
    width: window.screen.width,
    height: window.screen.height,
  }));

  // Définir le viewport avec la taille complète de l'écran
  await page.setViewport({
    width: screen.width,
    height: screen.height,
  });

  // Aller à la page de connexion
  await page.goto("https://apollo.lereacteur.io/");

  // Valider la connexion
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', process.env.EMAIL);

  await page.waitForSelector('input[name="password"]');
  await page.type('input[name="password"]', process.env.PW);
  await page.click("button.zenstyle-16r8c7u");

  // Sélectionner le cours
  await page.waitForSelector("a.zenstyle-shm7tl");
  await page.click("a.zenstyle-shm7tl");

  // Fonction pour cliquer sur les enfants svg avec la classe 'zenstyle-13jaz8d'
  async function clickOnSvgIcons() {
    // Attendre que le div parent avec la classe 'zenstyle-8lyrwn' soit chargé
    await page.waitForSelector("div.zenstyle-8lyrwn");

    // Sélectionner tous les svg enfants avec la classe 'zenstyle-13jaz8d'
    const svgs = await page.$$("div.zenstyle-8lyrwn svg.zenstyle-13jaz8d");

    // Boucler sur les svg et cliquer sur chaque élément
    for (const svg of svgs) {
      await svg.click();
    }
  }

  // Appel de la fonction pour cliquer sur les icônes SVG
  await clickOnSvgIcons();

  // Fonction pour cliquer sur tous les SVG enfants de tous les div.zenstyle-1d785g7, en ignorant le premier de chaque div
  async function clickOnAllSvgInAllSpecificDivs() {
    // Attendre que les divs avec la classe 'zenstyle-1d785g7' soient chargés
    await page.waitForSelector("div.zenstyle-1d785g7");

    // Sélectionner tous les divs avec la classe 'zenstyle-1d785g7'
    const allDivs = await page.$$("div.zenstyle-1d785g7");

    // Boucler sur chaque div
    for (const div of allDivs) {
      // Sélectionner tous les svg qui sont enfants de ce div
      const svgs = await div.$$("svg");

      // Boucler sur chaque SVG, en commençant par le deuxième (index 1)
      for (let i = 1; i < svgs.length; i++) {
        const svg = svgs[i]; // Prendre le SVG à l'index i
        try {
          // Vérifier si le SVG est encore attaché au DOM avant d'essayer de cliquer
          const isConnected = await page.evaluate((element) => element.isConnected, svg);

          if (isConnected) {
            // Faire défiler jusqu'à l'élément si nécessaire et cliquer
            await svg.scrollIntoViewIfNeeded();
            await svg.click();
          } else {
            console.log("Le SVG est détaché du document, passage au suivant.");
          }
        } catch (error) {
          console.log("Erreur lors du clic sur un SVG : ", error);
        }
      }
    }
  }
  // Appel de la fonction pour cliquer sur tous les SVG enfants de tous les div.zenstyle-1d785g7, en ignorant le premier de chaque div
  await clickOnAllSvgInAllSpecificDivs();

  // Fonction pour cliquer sur les SVG enfants des divs contenant un lien avec le texte "semaine"
  async function clickSvgIfLinkContainsSemaine() {
    // Attendre que les divs avec la classe 'zenstyle-1mwniey' soient chargés
    await page.waitForSelector("div.zenstyle-1mwniey");

    // Sélectionner tous les divs avec la classe 'zenstyle-1mwniey'
    const divs = await page.$$("div.zenstyle-1mwniey");

    for (const div of divs) {
      // Vérifier si ce div contient un lien avec le texte "semaine"
      const hasSemaineLink = await div.evaluate((div) => {
        const anchor = div.querySelector("a");
        return anchor && anchor.textContent.includes("semaine");
      });

      if (hasSemaineLink) {
        // Sélectionner tous les SVG enfants de ce div
        const svgs = await div.$$("svg");

        // Boucler sur chaque SVG et cliquer
        for (const svg of svgs) {
          try {
            await svg.scrollIntoViewIfNeeded();
            await svg.click();
            console.log("SVG cliqué.");
          } catch (error) {
            console.log("Erreur lors du clic sur un SVG : ", error);
          }
        }
      }
    }
  }

  // Appel de la fonction
  await clickSvgIfLinkContainsSemaine();
  // // Fonction pour récupérer tous les liens <a> enfants de div.zenstyle-8lyrwn
  // async function getAllLinksFromParentDiv() {
  //   // Attendre que le div avec la classe 'zenstyle-8lyrwn' soit chargé
  //   await page.waitForSelector("div.zenstyle-8lyrwn");

  //   // Sélectionner tous les liens <a> qui sont enfants de div.zenstyle-8lyrwn
  //   const links = await page.$$eval(
  //     "div.zenstyle-8lyrwn a",
  //     (anchors) => anchors.map((anchor) => anchor.href) // Récupérer les href de chaque lien
  //   );

  //   return links; // Retourner la liste des liens
  // }

  // // Fonction pour créer le dossier 'extract' s'il n'existe pas
  // async function createExtractFolder() {
  //   const dir = path.join(__dirname, "extract");
  //   if (!fs.existsSync(dir)) {
  //     fs.mkdirSync(dir);
  //   }
  // }

  // // Fonction pour aller sur chaque lien et réaliser une capture d'écran PDF
  // async function capturePdfFromLinks(links) {
  //   for (const link of links) {
  //     try {
  //       // Aller sur le lien
  //       await page.goto(link);

  //       // Attendre que le spinner avec l'ID 'loader-1' soit disparu
  //       await page.waitForSelector("#loader-1", { hidden: true });

  //       // Extraire le titre de la page
  //       const title = await page.title();
  //       const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase(); // Nettoyer le titre pour le nom de fichier

  //       // Générer le PDF avec le titre comme nom de fichier
  //       const pdfPath = path.join(__dirname, "extract", `${safeTitle}.pdf`);
  //       await page.pdf({ path: pdfPath, format: "A4" });

  //       console.log(`PDF créé pour : ${link} avec le titre : ${safeTitle}`);
  //     } catch (error) {
  //       console.log(`Erreur lors de la génération du PDF pour ${link} : `, error);
  //     }
  //   }
  // }

  // // Exemple d'utilisation de la fonction
  // const allLinks = await getAllLinksFromParentDiv(); // Récupérer les liens
  // console.log(allLinks); // Afficher les liens pour vérification

  // await capturePdfFromLinks(allLinks);
})();
