import http from 'http';
import {URLSearchParams} from 'url';
import * as crypto from 'crypto';
import express from 'express';
import OpenAI from "openai";
import * as fs from 'fs';

let lastTweetId = null;
let count = 0;
const posts = [
  "1/12 🚨 THE DAD OF ALL DEALS! 🇮🇳🤝🇺🇸\n\nHistory was made today as President Trump & PM Modi finalized the India-US Trade Deal. \n\nUS Tariffs on Indian goods are slashed from 50% to 18% effective IMMEDIATELY.\n\nLets see which sectors will get ppositively impacted👇! 🚀🔥\n\n#Nifty #indiaustradedeal",

  "2/12 🧵 TEXTILES: The Unstoppable Rally 👕\n\nThis is a vertical breakout for Indian apparel. With 18% tariffs, India now beats Vietnam & Bangladesh (20%). US retailers are already shifting orders to Bharat.\n\n🚀 Top Gainers:\n• Gokaldas Exports (+20% Upper Circuit)\n• Welspun Living (+19.8%)\n• KPR Mill (+20%)\n\n#Nifty #indiaustradedeal",

  "3/12 🌊 SEAFOOD: Shrimp Exporters Rejoice 🍤\n\nIndia is the US's #1 shrimp supplier. The deal removes punitive duties, allowing for massive margin expansion. Andhra’s aqua-hubs are buzzing!\n\n🌊 Top Gainers:\n• Apex Frozen Foods (+20% Upper Circuit)\n• Avanti Feeds (+20%)\n• Coastal Corp (+10%)\n\n#Nifty #indiaustradedeal",

  "4/12 💎 GEMS & JEWELLERY: Sparkling Back to Life ✨\n\nUS buyers were waiting for this tariff drop. Lower landed costs mean Indian diamonds and gold jewellery are now the top choice for US wholesalers.\n\n💎 Top Gainers:\n• Goldiam International (+20%)\n• Senco Gold (+15%)\n• Titan Company (+6%)\n\n#Nifty #indiaustradedeal",

  "5/12 💊 PHARMA: The US Revenue Boost 🧪\n\nUS generic markets provide 40% of revenue for Indian Pharma. A 7% drop in costs is a direct hit to the bottom line (EPS) for global generic giants.\n\n🔬 Top Gainers:\n• Sun Pharma (+4%)\n• Dr. Reddy's (+3.5%)\n• Aurobindo Pharma (+6%)\n\n#Nifty #indiaustradedeal",

  "6/12 ⚙️ AUTO ANCILLARIES: Engineering Excellence 🏎️\n\nIndian auto parts are now cheaper for US OEMs than Chinese or Mexican alternatives. India is the official 'China+1' engineering hub.\n\n⚡ Stocks to Watch:\n• Bharat Forge (+5%)\n• Sona BLW (+7%)\n• Samvardhana Motherson (+6%)\n\n#Nifty #indiaustradedeal",

  "7/12 🔌 EMS & ELECTRONICS: The iCET Vision 📱\n\nThe deal aligns with iCET for high-tech manufacturing. Tariffs on electronic components are dropping to help India scale up.\n\n⚡ Top Gainers:\n• Avalon Technologies (+20%)\n• Dixon Technologies (+8%)\n• Kaynes Tech (+10%)\n\n#Nifty #indiaustradedeal",

  "8/12 ☀️ RENEWABLES: Solar Export Surge 🔋\n\nUS tariff relief on solar modules and cells makes Indian manufacturers like Waaree global price leaders. Export order books are about to swell.\n\n⚡ Top Gainers:\n• Waaree Energies (+12.6%)\n• Tata Power (+5%)\n• Adani Green (+11%)\n\n#Nifty #indiaustradedeal",

  "9/12 🛢️ THE ENERGY PIVOT: Bye Bye Russia 🇷🇺➡️🇺🇸\n\nA major condition: India stops/reduces Russian oil imports. In return, India will buy $500B of US Energy, Coal, and LNG over 5 years!\n\n🔥 Stocks to Watch:\n• Reliance Industries (+7%)\n• Adani Enterprises (+11%)\n• GAIL (US LNG Play)\n\n#Nifty #indiaustradedeal",

  "10/12 🏢 REAL ESTATE & REITs: Data Center Dominance 🏙️\n\nUS tech giants like Google & Microsoft get incentives to build Data Centers in India. This unlocks massive land value for CPSEs and REITs.\n\n🏗️ Stocks to Watch:\n• Embassy Office Parks REIT\n• Anant Raj\n• DLF\n\n#Nifty #indiaustradedeal",

  "11/12 📈 BROKING & EXCHANGES: Volume Winter is Over ❄️🚫\n\nAfter a Budget-led dip, the trade deal has brought FIIs back. Record trading volumes today mean brokerage stocks are flying again.\n\n📊 Top Gainers:\n• BSE Ltd (+12%)\n• Angel One (+9.5%)\n• MCX (+8%)\n\n#Nifty #indiaustradedeal",

  "12/12 🏁 THE VERDICT: A New Economic Era 🇮🇳\n\nRupee is at 90.26, FIIs are net buyers, and India’s GDP growth is being revised UP by global banks. The 'Export Boom' has just begun.\n\nBuying the dip was the right move. Are you holding or folding? 👇✨\n\n#Nifty #indiaustradedeal"
];



//store refresh token in environment variable.
const CLIENT_ID = process.env.OAUTH2CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH2CLIENT_SECRET;
let refreshToken = process.env.REFRESH_TOKEN;

//define initial values for access token and time at which access token expires.
let accessTokenExpiresAt = 0;
let accessToken = null;

//check if access token is already generated and not expired.
const baseURL = "https://api.x.com/2/";
const accessTokenURL = "oauth2/token";
const tweetURL = "tweets";

//read prompt file for AI.
let file;
try{
	file = fs.readFileSync("./prompt.txt").toString();
} catch (err) {
	console.error(err);
}

//Oauth2 process starts.
function basicAuth(){
	const credentials = CLIENT_ID + ":" + CLIENT_SECRET;
	const buffer = Buffer.from(credentials, 'utf-8');
	const base64String = buffer.toString('base64');
	return base64String;
}


function isAccessTokenExpired() {
	const buffer = 60 * 1000; 				// refresh 1 min early
    return !accessToken || Date.now() >= (accessTokenExpiresAt - buffer);
}

async function refreshAccessToken() {
	try{
		const response = await fetch(baseURL + accessTokenURL, {
			method: "POST",
			headers: {
			  "Content-Type": "application/x-www-form-urlencoded",
			  "Authorization": `Basic ${basicAuth()}`
			},
			body: new URLSearchParams({
			  grant_type: "refresh_token",
			  refresh_token: refreshToken
			}).toString()
		});
		if(!response.ok){
			const text = await response.text();
			console.error(text);
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		// console.log(data.refresh_token);
		accessToken = data.access_token;
		refreshToken = data.refresh_token;          // 🔁 rotation
		accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
	} catch(error){
		console.error("Fetch operation falied: ", error);
	  }
  // OPTIONAL: persist refreshToken somewhere
}


async function getValidAccessToken() {
  if (isAccessTokenExpired()) {
    await refreshAccessToken();
  }
  // console.log(accessToken)
  return accessToken;
}


async function postTweet(){
	console.log(count);
	
	if (count >= posts.length) {
		console.log("Thread completed ✅");
		return;
  }
	let tweet = posts[count];
	count++;
	const token = await getValidAccessToken();
	const time = new Date().toLocaleTimeString("en-US", {
		  hour: "2-digit",
		  minute: "2-digit",
		  second: "2-digit",
		  hour12: true,
		});
		
	const body = {
				text: tweet,
				//community_id: '1471840562399485958',
			}	
	  // 🔗 If this is not the first tweet, reply to the previous one
	if (lastTweetId) {
		body.reply = {
		  in_reply_to_tweet_id: lastTweetId
		};
  }
	const tweet_options ={
		method: 'POST',
		headers: {
			'Content-Type': "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	}
	let response;
	try{
		response = await fetch(baseURL + tweetURL, tweet_options);
		console.log(`\nThe total remaining tweets in a day are: ${response.headers.get("x-app-limit-24hour-remaining")}`)
		const resetTime = new Date(response.headers.get("x-rate-limit-reset") * 1000);
		console.log(`\nTry after ${resetTime.toLocaleString()} time`);
		if(!response.ok){
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		
		// ✅ Save this tweet's ID for the next reply
		lastTweetId = data.data.id;
		console.log(`Tweet ${count}/${posts.length} posted`);
		console.log(`Tweet ID: ${lastTweetId}`);

		console.log(data);
		console.log(refreshToken)
		console.log(time)
	} catch(error){
		console.error("Posting tweet falied: ", error);
		if (response){
			try {
				const errorText = await response.text();  // Now accessible here
				console.error('Error response body:', errorText);
			  } catch (textError) {
				console.error('Failed to read error text:', textError);
			  }
			} else {
			  console.error('No response available (e.g., network error)');
			}
	}
}


async function postThread() {
  for (let i = 0; i < posts.length; i++) {
    await postTweet();
    await new Promise(resolve => setTimeout(resolve, 420000)); // 7 min gap
  }
}

postThread();