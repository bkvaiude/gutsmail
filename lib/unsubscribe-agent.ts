import puppeteer from 'puppeteer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface UnsubscribeResult {
  success: boolean;
  message: string;
  screenshot?: string; // Base64 encoded screenshot
  actions?: string[]; // List of actions taken
}

/**
 * AI-powered unsubscribe agent that uses Gemini to analyze unsubscribe pages
 * and automatically complete the unsubscribe process.
 */
export async function aiUnsubscribe(url: string): Promise<UnsubscribeResult> {
  let browser;
  const actions: string[] = [];

  try {
    // Launch browser
    actions.push('Launching browser');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to unsubscribe page
    actions.push(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of the page
    const screenshotBuffer = await page.screenshot({ encoding: 'base64' });
    actions.push('Captured page screenshot');

    // Get page HTML for text analysis
    const pageHTML = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);

    // Log page content preview
    console.log('📄 Page text preview (first 1000 chars):', pageText.slice(0, 1000));
    console.log('📄 Page text length:', pageText.length, 'characters');

    // Use Gemini to analyze the page and determine what actions to take
    actions.push('Analyzing page with Gemini AI');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are analyzing an unsubscribe page. Your task is to determine the exact steps needed to complete the unsubscription.

Page Text:
${pageText.slice(0, 5000)}

Instructions:
1. Identify the unsubscribe button, link, or form
2. Determine if any form fields need to be filled (email, reason, etc.)
3. Provide step-by-step instructions to complete the unsubscribe

Respond in JSON format ONLY:
{
  "hasUnsubscribeButton": true/false,
  "buttonText": "text of the button to click",
  "buttonSelector": "CSS selector or XPath to find the button",
  "requiresEmail": true/false,
  "emailFieldSelector": "CSS selector for email input",
  "requiresReason": true/false,
  "reasonFieldSelector": "CSS selector for reason dropdown/input",
  "defaultReason": "suggested reason to select",
  "requiresConfirmation": true/false,
  "confirmationButtonSelector": "CSS selector for confirmation button",
  "instructions": "step by step instructions"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Log AI response for debugging
    console.log('🤖 AI Response (raw):', responseText.slice(0, 500));

    // Extract JSON from response
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        console.error('❌ No JSON found in AI response. Full response:', responseText);
        throw new Error('No JSON found in AI response');
      }
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      console.error('   Raw response:', responseText);
      return {
        success: false,
        message: 'Failed to analyze unsubscribe page',
        screenshot: screenshotBuffer as string,
        actions,
      };
    }

    // Log parsed analysis
    console.log('🔍 AI Analysis:', JSON.stringify(analysis, null, 2));
    actions.push(`AI Analysis: ${analysis.instructions}`);

    // Execute the unsubscribe actions based on AI analysis
    if (analysis.hasUnsubscribeButton && analysis.buttonSelector) {
      try {
        // Try multiple selector strategies
        let button = null;

        // Try CSS selector
        try {
          button = await page.$(analysis.buttonSelector);
        } catch (e) {
          // Ignore
        }

        // If CSS fails, try finding by text
        if (!button && analysis.buttonText) {
          actions.push(`Searching for button with text: "${analysis.buttonText}"`);
          button = await page.evaluateHandle((buttonText) => {
            const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
            return buttons.find((btn) =>
              btn.textContent?.toLowerCase().includes(buttonText.toLowerCase())
            ) as HTMLElement;
          }, analysis.buttonText);

          if (button && (await button.asElement())) {
            actions.push(`Found button with text: "${analysis.buttonText}"`);
          } else {
            button = null;
          }
        }

        // Fill email if required
        if (analysis.requiresEmail && analysis.emailFieldSelector) {
          actions.push('Filling email field');
          // This would need the user's email - for now we'll skip
          // await page.type(analysis.emailFieldSelector, userEmail);
        }

        // Select reason if required
        if (analysis.requiresReason && analysis.reasonFieldSelector && analysis.defaultReason) {
          actions.push(`Selecting reason: ${analysis.defaultReason}`);
          try {
            await page.select(analysis.reasonFieldSelector, analysis.defaultReason);
          } catch (e) {
            // Try to type if it's a text field
            await page.type(analysis.reasonFieldSelector, analysis.defaultReason);
          }
        }

        // Click the unsubscribe button
        if (button) {
          actions.push('Clicking unsubscribe button');
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          actions.push('Clicked unsubscribe button');

          // Handle confirmation if needed
          if (analysis.requiresConfirmation && analysis.confirmationButtonSelector) {
            actions.push('Waiting for confirmation dialog');
            await new Promise(resolve => setTimeout(resolve, 1000));

            const confirmButton = await page.$(analysis.confirmationButtonSelector);
            if (confirmButton) {
              actions.push('Clicking confirmation button');
              await confirmButton.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }

          // Take final screenshot
          const finalScreenshot = await page.screenshot({ encoding: 'base64' });

          // Check if we're on a success page
          const finalText = await page.evaluate(() => document.body.innerText);
          const successIndicators = [
            'unsubscribed',
            'successfully',
            'removed',
            'confirmed',
            'will no longer receive',
          ];
          const hasSuccess = successIndicators.some((indicator) =>
            finalText.toLowerCase().includes(indicator)
          );

          return {
            success: hasSuccess,
            message: hasSuccess
              ? 'Successfully unsubscribed'
              : 'Unsubscribe action completed (success uncertain)',
            screenshot: finalScreenshot as string,
            actions,
          };
        }

        console.error('❌ Could not find button element on page');
        console.error('   Button selector attempted:', analysis.buttonSelector);
        console.error('   Button text searched:', analysis.buttonText);
        return {
          success: false,
          message: 'Could not find unsubscribe button on page',
          screenshot: screenshotBuffer as string,
          actions,
        };
      } catch (error: any) {
        console.error('❌ Error executing unsubscribe:', error);
        return {
          success: false,
          message: `Error during unsubscribe: ${error.message}`,
          screenshot: screenshotBuffer as string,
          actions,
        };
      }
    } else {
      console.error('❌ AI determined no unsubscribe button exists');
      console.error('   hasUnsubscribeButton:', analysis.hasUnsubscribeButton);
      console.error('   buttonSelector:', analysis.buttonSelector);
      console.error('   Page text preview:', pageText.slice(0, 500));
      return {
        success: false,
        message: 'No unsubscribe button detected on page',
        screenshot: screenshotBuffer as string,
        actions,
      };
    }
  } catch (error: any) {
    console.error('AI Unsubscribe error:', error);
    return {
      success: false,
      message: `Failed to process unsubscribe: ${error.message}`,
      actions,
    };
  } finally {
    if (browser) {
      await browser.close();
      actions.push('Browser closed');
    }
  }
}
