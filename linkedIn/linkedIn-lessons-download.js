/**
 * Download LinkedIn Learning Courses.
 * 
 * The script requires 'dom-to-image.js'. It should be pasted in the browser's console along with the current script.
 * And will provide domtoimage() function that is used to downland the quizzes as .png files. 
 * It cannot be loaded as external script because the CORS of the site.
 * 
 * By default, the script will download all the videos and quizzes as .mp4 and .png files - one by one from the beginning.
 * It takes 5-6 seconds for each item to be processed, because I'v tried to handle relatively slow Internet connection wit long timeouts.
 * 
 * Once the script (and 'dom-to-image.js') are pasted in the console you can start the action by calling the function 'download()'.
 * 
 * The function 'download()' takes 3 optional parameters:
 * > startFromLesson         - The first lesson to be downloaded. Default is 1. When the value is set to 0, the script will download only the current lesson.
 * > lessonsNumberToDownload - The number of the lessons to be downloaded. Default is null - which means no limit, or all.
 * > listOfLessonsToDownload - An array of the numbers of the lessons to be downloaded. Default is null - which means disabled.
 *                             If the array is not empty, the script will download only the lessons in the array.
 *                             Note if you need to download the first lesson you must set element with value 1 (not 0).
 *                             This parameter takes precedence over the 'lessonsNumberToDownload' and 'startFromLesson' parameters.
 * > downloadType            - 'all', 'video' or 'quiz'. Default is 'all'.
 * 
 * Examples of usage:
 *  download();                       // download all videos and quizzes from the beginning
 *  download(1);                      // the same as the above...
 *  download(5);                      // download all videos and quizzes from the 5th lesson to the end
 *  download(5, 3);                   // start from the 5th lesson and download 3 videos and/or quizzes
 *  download(5, 1);                   // download only the 5th lesson
 *  download(1, null, null, 'video'); // download only the videos from the beginning to the end
 *  download(1, 1, [3, 5, 7]);        // download the resources for the 3rd, 5th and 7th lesson only
 *  download(5, null, [7, 3, 5]);     // the same as the above...
 *  download(0);                      // get the current lesson only
 *  download(0, 2, [3, 5]);           // the same as the above...
 * 
 * The videos are much easier to be handled, because quizzes have multiple pages and you must solve one question to view the next.
 * So probably you will want to: 1st download all videos, and then download manually the quizzes (if you need them),
 * one by one, after solving each of them - 'download(42, false);' (where 42 is the lesson number).
 */

// The Lesson class whose instances does the job of downloading the videos and quizzes
class Lesson {
    constructor(lesson, courseName, downloadType, chapters, lessons) {
        this.lesson = lesson;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.fileExt = "mp4";
        this.lessonType = "video";
        this.lessonIndex = "";
        this.setDataAndProcess(courseName, chapters, lessons, downloadType);
    }

    async setDataAndProcess(courseName, chapters, lessons, downloadType = "all") {
        // Get the current lesson, it is 'this.lesson' but when 'startFromLesson = 0' we capturing the current lesson...
        const currentLesson = document.querySelector(".classroom-toc-item--selected");

        // Get the title of the lesson
        const lessonTitle = currentLesson
            .querySelector(".classroom-toc-item__title").innerText
            .replace(/\n.*$/, "").replace(/:/g, " -").replace(/^\d+\s*[-.]\s/, "").trim();
        // Get the duration of the lesson
        const duration = currentLesson.querySelector(".classroom-toc-item__title + div").innerText
            .replace(/ /, "").trim();
        // Compose the full title of the lesson
        this.lessonTitle = `${lessonTitle} (${duration})`;

        // Get the current chapter/section and its index/number within the list of chapters
        const currentChapter = currentLesson.parentElement.parentElement;
        const currentChapterIndex = chapters.indexOf(currentChapter);

        // Get the title of the chapter
        this.chapterTitle = currentChapter
            .querySelector("h2 span.classroom-toc-section__toggle-title").innerText
            .replace(/\n.*$/, "").replace(/:/g, " -").replace(/^\d+\s*[-.]\s/, "").trim();

        // Get the current lesson's index/number within the chapter 
        const lessonsInCurrentChapter = currentLesson.parentElement.querySelectorAll("li");
        this.lessonNumber = Array.from(lessonsInCurrentChapter).indexOf(currentLesson) + 1;

        // Get the course count number length that will be used for a padding within the file name
        // If the total count of the lesson is 342 (for example), the length of the number is 3
        const lessonsCount = lessons.length;
        const lessonsCountLength = lessonsCount.toString().length;

        // Construct the lesson index that will be used for the file name, i.e. [017 - 342]
        this.lessonIndex = `[${(lessons.indexOf(currentLesson) + 1).toString().padStart(lessonsCountLength, "0")} - ${lessonsCount}]`;

        // Construct the name of the file, the extension will be added later
        this.fileName = `${courseName} ${this.lessonIndex} ${currentChapterIndex}. ${this.chapterTitle} ${this.lessonNumber}. ${this.lessonTitle}`;

        // Check whether the lesson is quiz or video and process it accordingly
        if (lessonTitle === "Chapter Quiz") {
            this.lessonType = "quiz";
            this.fileExt = "png";
            this.src = document.querySelector(".classroom-quiz .chapter-quiz");
            const fullFileName = `${this.fileName}.${this.fileExt}`; // console.log(fullFileName);

            if (downloadType === "all" || downloadType === "quiz") {
                await this.downloadPng(fullFileName);
            } else {
                console.log(`${fullFileName} :: is skipped!`);
            }
        } else {
            this.lessonType = "video";
            this.fileExt = "mp4";
            this.src = document.querySelector("video").src;
            const fullFileName = `${this.fileName}.${this.fileExt}`; // console.log(fullFileName);

            if (downloadType === "all" || downloadType === "video") {
                await this.downloadVideo(fullFileName);
            } else {
                console.log(`${fullFileName} is skipped!`);
            }
        }
    }

    async downloadVideo(fullFileName) {
        return fetch(this.src)
            .then(response => response.blob())
            .then(blob => {
                const blobURL = URL.createObjectURL(blob);
                const downloadLink = document.createElement("a");
                downloadLink.href = blobURL;
                downloadLink.style = "display: none";

                downloadLink.download = fullFileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();

                return new Promise(resolve => {
                    document.body.removeChild(downloadLink);
                    console.log(fullFileName); // Log the file name
                    setTimeout(resolve, 1500);
                });
            })
            .catch((error) => `Video fetch error: ${error}`);
    }

    async downloadPng(fullFileName) {
        return domtoimage.toPng(this.src)
            .then(function (dataUrl) {
                const downloadLink = document.createElement("a");
                downloadLink.href = dataUrl;
                document.body.appendChild(downloadLink);
                downloadLink.download = fullFileName;
                downloadLink.click();

                return new Promise(resolve => {
                    document.body.removeChild(downloadLink);
                    console.log(fullFileName); // Log the file name
                    setTimeout(resolve, 3500);
                });

            })
            .catch(function (error) {
                console.error("Oops, something went wrong with DOM-to-image!", error);
            });
    }

}

// Get common data from the page
let courseName = document.querySelector(".classroom-nav__details h1").innerText.replace(/\n.*$/, "").trim();
let overview = document.querySelector(".classroom-workspace-overview__header");
if (overview) {
    let courseDuration = overview.querySelector("ul > li:first-child").innerText.replace(/\s+/g, "").trim();
    courseName = `${courseName} (${courseDuration})`;
} 
let chapters = document.querySelectorAll("section.classroom-toc-section"); // ("ul.classroom-toc-section__items")
let lessons = document.querySelectorAll("li.classroom-toc-item");

function download(
    startFromLesson = 1,
    lessonsNumberToDownload = null,
    listOfLessonsToDownload = null,
    downloadType = "all"
) {
    // Handle the case when we capturing the current lesson only: startFromLesson = 1
    if (startFromLesson === 0) {
        lessonsNumberToDownload = 1;
        listOfLessonsToDownload = null;
    }

    // Expand all sections
    const buttons = document.querySelectorAll("section > h2 > button.classroom-toc-section__toggle");
    buttons.forEach(button => {
        if (button.ariaExpanded == "false") button.click();
    });

    // Collect the data of the lessons
    setTimeout(() => {
        chapters = document.querySelectorAll("section.classroom-toc-section");
        chapters = Array.from(chapters);

        lessons = document.querySelectorAll("li.classroom-toc-item");
        lessons = Array.from(lessons);

        let lessonsLoop;
        if (listOfLessonsToDownload) {
            // lessonsLoop = lessons.filter((value, index) => listOfLessonsToDownload.includes(index + 1) ? true : false);
            lessonsLoop = lessons.filter((value, index) => listOfLessonsToDownload.includes(index + 1));
            console.log(`Chapters: ${chapters.length}, Lessons: ${lessons.length}, Download items: ${listOfLessonsToDownload}`);
        } else {
            lessonsLoop = [...lessons];
            lessonsLoop.splice(0, startFromLesson - 1);
            console.log(`Chapters: ${chapters.length}, Lessons: ${lessons.length}, Start from: ${startFromLesson}, Download: ${lessonsNumberToDownload ? lessonsNumberToDownload : "all"}`);
        }

        // Create an object for each lesson, the object will do everything, including the download
        async function collectData() {
            let counter = 0;

            for (const lesson of lessonsLoop) {
                if (lessonsNumberToDownload && counter++ >= lessonsNumberToDownload && !listOfLessonsToDownload) return;

                if (lesson !== document.querySelector(".classroom-toc-item--selected") && startFromLesson !== 0) lesson.querySelector("a").click();

                await new Promise(resolve => setTimeout(resolve, 2000));

                const lessonItem = new Lesson(lesson, courseName, downloadType, chapters, lessons);

                let timeout = 2000;
                if (lessonItem.lessonType === "quiz") timeout = 4000;
                await new Promise(resolve => setTimeout(resolve, timeout));
            }
        }
        collectData();
    }, 1000);
}

// download(3, 2);
// download(27);
// download(1, 1, [3, 5, 10]);
// download(11, null, null, 'video');
download(4, null, null, 'video');
// download(0);