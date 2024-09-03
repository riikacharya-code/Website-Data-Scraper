import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import * as cheerio from 'cheerio';


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const url = 'https://itwirly-50b5c.uc.r.appspot.com/update';

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
        "email_identifier": z.literal("msmahuac@gmail.com_wh_ra_neiman_marcus_WN00001483409xyzaa"),
        "cats": z.array(z.string()),
        "vendors": z.string(),
        "ordered_item": z.string(),
        "date": z.string(),
        "sender": z.string(),
        "size": z.string(),
        "item_category": z.string(),
        "msg_id": z.literal("wh_ra_neiman_marcus_WN00001483409xyz"),
        "email_class": z.string(),
        "user_id": z.literal("smNJ4JT10YPDiZnNkAOauc7j1v52"),
        "no_cat_flag": z.string(),
        "dress_category": z.string()
});


async function getData(url)
{
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const htmlContent = await response.text();
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

        
        let currentElement = parent;

        while (currentElement.length > 0) {
          if (preservedParents.has(currentElement[0])) {
            return false;
          }

          currentElement = currentElement.parent();
        }
        return true; 
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
    
    const mainContent = $('body').html().trim();
    
    return mainContent;
}
  
async function run(){
    try {
        const htmlContent = await getData('https://www.neimanmarcus.com/p/prod256420941');

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
            const data = JSON.parse(completion.choices[0].message.content);
            
            const postResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!postResponse.ok) {
                throw new Error(`HTTP error! status: ${postResponse.status}`);
            }

            const postData = await postResponse.json();
            console.log('Response:', postData);
        } else {
            console.log("No HTML content fetched.");
        }
    } catch (error) {
        console.error("Error during OpenAI API call:", error);
    }
   
}

run();
