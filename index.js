import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


const InstructionFormat = z.object({
        "subject": z.string(),
        "sync_log_id": z.string(),
        "img_url": z.array(z.string()),
        "product_color": z.string(),
        "last_updated": z.string(),
        "price": z.string(),
        "order_number": z.string(),
        "discounted_price": z.string(),
        "category_cache": z.object({
            "parent_category": z.string(),
            "category_ref_data_version": z.literal(9),
            "tags": z.array(z.string()),
            "force_refresh": z.literal(false),
            "subcategories": z.array(z.string())
        }),
        "brand": z.string(),
        "email_identifier": z.literal("msmahuac@gmail.com_wh_ra_neiman_marcus_WN00001483409"),
        "cats": z.array(z.string()),
        "vendors": z.string(),
        "ordered_item": z.string(),
        "date": z.string(),
        "sender": z.string(),
        "size": z.string(),
        "item_category": z.string(),
        "msg_id": z.literal("wh_ra_neiman_marcus_WN00001483409"),
        "email_class": z.string(),
        "user_id": z.literal("smNJ4JT10YPDiZnNkAOauc7j1v52"),
        "no_cat_flag": z.string(),
        "dress_category": z.string()
});


async function getData(url)
{
    try {
        const htmlContent = await getHtmlContent(url);
        return htmlContent;
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

async function reduceHtmlContent(html) {
    const $ = cheerio.load(html);
    
    $('footer, nav').remove();

    const importantElements = $('img');

    const preservedParents = new Set();
    importantElements.each((i, el) => {
        preservedParents.add($(el).parent());
    });

    const isNonEssential = (el) => {
        const parent = $(el).parent();

        // Check if this parent or any ancestor is preserved
        let currentElement = parent;

        while (currentElement.length > 0) {
          if (preservedParents.has(currentElement[0])) {
            return false; // Don't remove this element
          }

          currentElement = currentElement.parent();
        }
        return true; // This element can be safely removed
    };

    $('script, style, aside, noscript').each((i, el) => {
        if (isNonEssential(el)) {
          $(el).remove();
        }
      });

  
    $('[class*="ad"], [id*="ad"]').each((i, el) => {
        if (isNonEssential(el)) {
          $(el).remove();
        }
      });
    
    /*if (reducedContent.length > 4096) {
      reducedContent = reducedContent.substring(0, 4096) + '...';  // Truncate the content
    }*/
    
    const mainContent = $('body').html().trim();
    
    return mainContent;
}
  

async function run(){
    try {
        const htmlContent = await getData('https://www.neimanmarcus.com/p/prod258040262');

        if (htmlContent){
            const reducedContent = await reduceHtmlContent(htmlContent);
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-2024-08-06",
                messages: [
                { role: "system", content: "Extract the order information from the website HTML. Make sure the order image is not left out. Under no circumstances are you allowed to use fake image urls." },
                { role: "user", content: reducedContent },
                ],
                response_format: zodResponseFormat(InstructionFormat, "instruction"),
            });
            console.log(completion.choices[0].message.content);
            const curlCommand = `curl --location 'https://itwirly-50b5c.uc.r.appspot.com/update' \\\n--header 'Content-Type: application/json' \\\n--data-raw '${completion.choices[0].message.content}\n\n'`;

            exec(curlCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
            });
        } else {
            console.log("No HTML content fetched.");
        }
    } catch (error) {
        console.error("Error during OpenAI API call:", error);
    }
   
}


async function getHtmlContent(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching the HTML:', error);
    }
}



run()
