//reddit scraping to downlaod and make pdfs of the top posts in a subreddit
//  node script.js --subreddit="[name of your subredit]"

let minimist = require('minimist');
let jsdom = require('jsdom');
let axios = require('axios');
let path = require('path');
let fs = require('fs');
let pdf = require('pdf-lib');
const { TextRenderingMode } = require('pdf-lib');
    
let args = minimist(process.argv);

let base = 'https://old.reddit.com';
let url = `https://old.reddit.com/r/${args.subreddit}/`;

writePostJson(args, url, base);

function writePostJson(args, url, base) {
    fs.rmdirSync(args.subreddit, { recursive: true, force: true });
    fs.mkdirSync(args.subreddit);
    fs.mkdirSync(path.join(args.subreddit, 'pdfs'));

    //getting the html file
    let getHtml = axios.get(url);

    getHtml.then(function (response) {
        let dom = new jsdom.JSDOM(response.data);
        let document = dom.window.document;

        //creating posts.json
        let linkDivs = document.querySelectorAll('.sitetable > div.link');

        let posts = [];

        for (let i = 0; i < linkDivs.length; i++) {
            let title = linkDivs[i].querySelector('p.title > a');
            let link = linkDivs[i].querySelector('a');
            let commentLink = linkDivs[i].querySelector('li.first > a');
            posts.push({
                title: title.textContent,
                link: link.href,
                commentLink: commentLink.href
            });
        }
        //create post folder and write posts.json file
        let fileName = path.join(args.subreddit, 'posts.json');
        fs.writeFileSync(fileName, JSON.stringify(posts), 'utf-8');

        for (let i = 0; i < posts.length; i++) {

            let getHtml = axios.get(posts[i].commentLink);
            getHtml.then(function (response) {
                let dom = new jsdom.JSDOM(response.data);
                let document = dom.window.document;

                let title = document.querySelector('p.title > a').textContent.replace(/[^\w\s]/g, '');

                let subtitles = document.querySelectorAll('.link .md > p');
                let subtitlesArray = [];
                for (let i = 0; i < subtitles.length; i++) {
                    subtitlesArray.push(subtitles[i].textContent.replace(/[^\w\s]/g, ''));
                }

                let comments = document.querySelectorAll('div.comment div.md > p');
                let commentsArray = [];
                for (let i = 0; i < comments.length; i++) {
                    commentsArray.push(comments[i].textContent.replace(/[^\w\s]/g, ''));
                }

                //let fileName = title.replace(/[^\w\s]/g, '')


                let data = {
                    title: title,
                    subtitles: subtitlesArray,
                    comments: commentsArray
                };

                //creating pdfs
                let pdfDocPromise = pdf.PDFDocument.create();

                pdfDocPromise.then(function (pdfDoc) {
                    let page = pdfDoc.addPage();

                    let letters = data.title;
                    //for title
                    let chunks = [];

                    for (let i = 0, e = 60, charsLength = letters.length; i < charsLength; i += 60, e += 60) {
                        chunks.push(letters.substring(i, e));
                    }

                    let { width, height } = page.getSize();
                    let fontSize = 18;

                    let x = 50;

                    let y = height - 4 * fontSize;
                    for (let i = 0; i < chunks.length; i++) {
                        page.drawText(chunks[i], {
                            x: x,
                            y: y,
                            size: fontSize
                        });
                        y = y - 18;
                        // x = x + 20;
                    }

                    //for subtitles
                    chunks = [];
                    let lettersArray = data.subtitles;

                    if (lettersArray.length > 0) {
                        for (let j = 0; j < lettersArray.length; j++) {
                            let letters = lettersArray[j];
                            for (let i = 0, e = 80, charsLength = letters.length; i < charsLength; i += 80, e += 80) {
                                chunks.push(letters.substring(i, e));
                            }
                        }
                    }

                    fontSize = 12;
                    for (let i = 0; i < chunks.length; i++) {
                        if (chunks[i].length > 0 && y > 10) {
                            page.drawText(chunks[i], {
                                x: x,
                                y: y,
                                size: fontSize
                            });
                            y = y - 18;
                        }
                    }

                    //for comments
                    chunks = [];
                    lettersArray = data.comments;

                    if (lettersArray.length > 0) {
                        for (let j = 0; j < lettersArray.length; j++) {
                            let letters = lettersArray[j];
                            for (let i = 0, e = 100, charsLength = letters.length; i < charsLength; i += 100, e += 190) {
                                chunks.push(letters.substring(i, e));
                            }
                        }
                    }

                    fontSize = 10;

                    // title : comments

                    y = y - 30;
                    page.drawText('Comments : ', {
                        x: x,
                        y: y,
                        size: fontSize + 2
                    });

                    y = y - 18;

                    for (let i = 0; i < chunks.length; i++) {
                        if (chunks[i].length > 0 && y > 10) {
                            page.drawText(" - " + chunks[i], {
                                x: x,
                                y: y,
                                size: fontSize
                            });
                            y = y - 18;
                        }
                    }

                    let pdfBytesPromise = pdfDoc.save();

                    pdfBytesPromise.then(function (pdfBytes) {
                        let fileName = data.title.substr(0, 40);
                        fs.writeFileSync(path.join(args.subreddit, 'pdfs', fileName + '.pdf'), pdfBytes, 'utf-8');
                    });

                });
            });
        }

    });
}