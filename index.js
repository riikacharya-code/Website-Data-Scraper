import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';

/*
const { OPENAI_API_KEY } = process.env;

// Set up OpenAI Client
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});
*/


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


const InstructionFormat = z.object({
    
    "list":z.array(
    z.object({
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
    })
)
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
        const htmlContent = await getData('https://www.neimanmarcus.com/p/prod259370971');

        if (htmlContent){
            console.log(htmlContent)
            const reducedContent = await reduceHtmlContent(htmlContent);
            console.log(reducedContent)
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-2024-08-06",
                messages: [
                { role: "system", content: "Extract the order information for every single from the website HTML. Make sure the order images are not left out. Under no circumstances are you allowed to use fake image urls." },
                { role: "user", content: reducedContent },
                ],
                response_format: zodResponseFormat(InstructionFormat, "instruction"),
            });
            console.log(completion.choices[0].message.content);
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
