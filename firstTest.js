const { Builder, Browser, By, until } = require('selenium-webdriver');

// Configuration object for XPath navigation steps
const navigationSteps = [
    {
        xpath: '//*[@id="page-wrapper"]/div[2]/div/nav/a[3]',
        description: 'first link'
    },
    {
        xpath: '//*[@id="matchCenter"]/div[2]/nav/a[2]',
        description: 'second link'
    },
    {
        xpath: '//*[@id="page-wrapper"]/div[4]/div[1]/nav/a[3]',
        description: 'third link'
    },
    {
        xpath: '/html/body/div[1]/div[2]/div[3]/div[2]/div[3]/div[2]/a/div[2]/div',
        description: 'final link'
    }
];

// Configuration for news article selection
const newsConfig = {
    // Base XPath for news articles
    baseXPath: "//a[contains(@href,'cricket-news')]",
    // Additional filters that can be combined
    filters: {
        byTitle: (keyword) => `[contains(@title, '${keyword}')]`,
        byHref: (newsId) => `[contains(@href,'${newsId}')]`,
        byText: (text) => `[contains(text(), '${text}')]`,
        byDate: (date) => `[contains(@data-date, '${date}')]` // if the site uses data attributes
    }
};

// Function to build dynamic news XPath
function buildNewsXPath(options = {}) {
    let xpath = newsConfig.baseXPath;
    
    // Add title filter if provided
    if (options.title) {
        xpath += newsConfig.filters.byTitle(options.title);
    }
    
    // Add href/news ID filter if provided
    if (options.newsId) {
        xpath += newsConfig.filters.byHref(options.newsId);
    }
    
    // Add text content filter if provided
    if (options.text) {
        xpath += newsConfig.filters.byText(options.text);
    }
    
    // Add date filter if provided
    if (options.date) {
        xpath += newsConfig.filters.byDate(options.date);
    }
    
    return xpath;
}

// Function to find and click news articles with fallback options
async function findAndClickNews(driver, options, timeout = 5000) {
    const xpaths = [];
    
    // Generate primary XPath with all specified filters
    xpaths.push(buildNewsXPath(options));
    
    // Generate fallback XPaths with fewer filters
    if (options.title && options.newsId) {
        xpaths.push(buildNewsXPath({ title: options.title }));
        xpaths.push(buildNewsXPath({ newsId: options.newsId }));
    }
    
    // Try each XPath until one works
    for (const xpath of xpaths) {
        try {
            console.log(`Trying to find news article with XPath: ${xpath}`);
            const success = await clickElementByXPath(driver, xpath, 'news article', timeout);
            if (success) {
                return true;
            }
        } catch (error) {
            console.log(`XPath attempt failed: ${xpath}`);
            continue;
        }
    }
    
    throw new Error('Unable to find news article with any of the provided criteria');
}

async function clickElementByXPath(driver, xpath, description, timeout = 5000) {
    try {
        console.log(`Attempting to click on ${description}...`);
        
        const element = await driver.wait(
            until.elementLocated(By.xpath(xpath)),
            timeout,
            `Timeout waiting for ${description} to be located`
        );
        
        await driver.wait(
            until.elementIsVisible(element),
            timeout,
            `Timeout waiting for ${description} to be visible`
        );

        await driver.executeScript("arguments[0].scrollIntoView(true);", element);
        await driver.sleep(500);

        try {
            await element.click();
        } catch (clickError) {
            console.log(`Regular click failed for ${description}, trying JavaScript click...`);
            await driver.executeScript("arguments[0].click();", element);
        }

        console.log(`Successfully clicked on ${description}`);
        await driver.sleep(2000);
        
        return true;
    } catch (error) {
        console.error(`Error clicking ${description}:`, error.message);
        return false;
    }
}

async function runTest() {
    let driver;
    try {
        driver = await new Builder().forBrowser(Browser.CHROME).build();
        await driver.get('https://www.cricbuzz.com/');
        
        // Execute navigation steps
        for (const step of navigationSteps) {
            const success = await clickElementByXPath(driver, step.xpath, step.description);
            if (!success) {
                console.log(`Navigation failed at ${step.description}, continuing to next step...`);
            }
        }

        // Example usage of dynamic news article selection
        await findAndClickNews(driver, {
            title: 'six-takeaways-from-bangladeshs-historic-win',
            newsId: '131517',
            
            // You can add more search criteria as needed:
            // text: 'specific text to match',
            // date: '2024-02-20'
        });
        await findAndClickNews(driver, {
            title: 'clinical-bangladesh-complete-historic-series-sweep-of-pakistan',
            newsId: '131508',
            
            // You can add more search criteria as needed:
            // text: 'specific text to match',
            // date: '2024-02-20'
        });

    } catch (error) {
        console.error('Test execution failed:', error);
    } finally {
        if (driver) {
            console.log('All actions completed. Closing the browser...');
            await driver.quit();
        }
    }
}

// Execute the test
runTest();