/**
 * Download Teachable Courses.
 */

// Load the html2pdf library, https://github.com/eKoopmans/html2pdf.js
function addScript(url) {
    var script = document.createElement("script");
    script.type = "application/javascript";
    script.src = url;
    document.head.appendChild(script);
}
addScript("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");

// The Lesson class whose instances does the job of downloading the videos and quizzes
class Lesson {
    constructor(lesson, courseName, chapters, lessons) {
        this.lesson = lesson;
        this.src = "";
        this.chapterTitle = "";
        this.lessonNumber = null;
        this.lessonTitle = "";
        this.fileName = "";
        this.fileExt = ".mp4";
        this.lessonType = "video-or-pdf-or-zip";
        this.lessonIndex = "";
        this.setData(courseName, chapters, lessons);
    }

    async setData(courseName, chapters, lessons) {
        const currentLesson = document.querySelector(".section-item.next-lecture"); // this.lesson

        this.lessonTitle = currentLesson
            .querySelector(".lecture-name").innerText.replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1m$2s)").replace(/:/g, "-").replace(/\s+_*\s*/, " ").replace(/^\d+\-\s/, "").trim();

        this.chapterTitle = currentLesson.parentElement.parentElement
            .querySelector(".section-title").innerText.replace(/\n.*$/, "").replace(/\((\d+):(\d+)\)/, "($1h$2m)").replace(/:/g, "-").replace(/\s+_*\s*/, " ").trim();

        const currentChapter = currentLesson.parentElement.parentElement;
        const currentChapterIndex = chapters.indexOf(currentChapter);

        const lessonsInCurrentChapter = currentLesson.parentElement.querySelectorAll("li");
        this.lessonNumber = Array.from(lessonsInCurrentChapter).indexOf(currentLesson) + 1;

        const lessonsCount = lessons.length;
        const lessonsCountLength = lessonsCount.toString().length; // If the total count of the lesson is 342 (for example), the length of the number is 3.

        this.lessonIndex = `${(lessons.indexOf(currentLesson) + 1).toString().padStart(lessonsCountLength, "0")} - ${lessonsCount}`;

        this.fileName = `${courseName} [${this.lessonIndex}] ${currentChapterIndex}. ${this.chapterTitle} ${this.lessonNumber}. ${this.lessonTitle}`;

        const thisDownloadLinks = Array.from(document.querySelectorAll("a.download"));

        if (thisDownloadLinks[0]) {
            for (const link of thisDownloadLinks) {
                this.lessonType = "video-or-pdf-or-zip";
                this.fileExt = link.dataset['xOriginDownloadName'].split(".").pop();
                this.src = link.href;
                
                const fullFileName = `${this.fileName}.${this.fileExt}`;
                // console.log(fullFileName);
    
                await this.downloadResource(fullFileName);
            }
        } else {
            this.lessonType = "quiz";
            this.src = document.querySelector('div[role=main].course-mainbar');
            
            const fullFileName = `${this.fileName}.pdf`;
            // console.log(fullFileName);

            await this.downloadScreenShot(fullFileName);
        }
    }

    async downloadResource(fullFileName) {
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
                    setTimeout(() => {
                        console.log(fullFileName);

                        document.body.removeChild(downloadLink);
                        resolve();
                    }, 1500);
                });
            })
            .catch((error) => `Video fetch error: ${error}`);
    }

    async downloadScreenShot(fullFileName) {
        return html2pdf().set({ "filename": fullFileName }).from(this.src).save().then(() => {
            return new Promise(resolve => {
                console.log(fullFileName);

                setTimeout(resolve, 5500);
            });
        });
    }
}

// Get common data from the page
const courseName = document.querySelector(".course-sidebar-head > h2").innerText.replace(/\n.*$/, "").trim();
let chapters = document.querySelectorAll('.course-section');
let lessons = document.querySelectorAll('.course-section li.section-item');

// Collect the data of the Lessons
// Probably instead of loop it is better to use a recursive function,
// which shifts the 'lessons' array at each iteration, process the shifted element,
// and pass the rest array to itself as callback by promise.
function download(offset = 1) {

    setTimeout(() => {
        chapters = document.querySelectorAll('.course-section');
        chapters = Array.from(chapters);

        lessons = document.querySelectorAll('.course-section li.section-item');
        lessons = Array.from(lessons);

        lessonsLoop = [...lessons];
        lessonsLoop.splice(0, offset - 1);

        // Create a Video object for each lesson - collect information
        async function collectData() {
            for (const lesson of lessonsLoop) {
                lesson.querySelector('a').click();
                await new Promise(resolve => setTimeout(resolve, 10000));

                const lessonItem = new Lesson(lesson, courseName, chapters, lessons);
                let timeout = 10000;
                if (lessonItem.lessonType === "quiz") timeout = 4000;
                await new Promise(resolve => setTimeout(resolve, timeout));
            }
        }
        collectData();
    }, 1000);
}

download(183);

