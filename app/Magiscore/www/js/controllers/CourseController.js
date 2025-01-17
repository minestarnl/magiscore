class CourseController {
    constructor(viewcontroller) {
        this.courses = [];
        this.controller = viewcontroller;
        this.courseIds = []
        this.allGrades = [];
        this.latestGrades = [];
    }

    add(course) {
        this.courses.push({
            "id": course.id,
            "course": course
        })
        this.courseIds.push(course.id)
        course.grades.forEach(grade => {
            this.allGrades.push(grade)
        })
        _.sortBy(this.allGrades, 'dateFilledIn')
    }

    remove(course) {
        this.courses = _.remove(this.courses, function (c) {
            return c.id == course.id;
        })
        // this.courses.remove({
        //     "id": course.id,
        //     "course": course
        // })
    }

    clear() {
        this.courses = []
        this.allGrades = []
    }

    save() {
        localStorage.setItem("courses", JSON.stringify(this.courses));
    }

    current() {
        // var latestDate = new Date(Math.max(null, this.courses.map(x => {
        //     return x.end
        // })))
        // var currentCourse = this.courses.find(x => x.end == latestDate)
        // return currentCourse
        return /*this.courses.find(x => x.course.current === true) || */ this.courses[this.courses.length - 1]
    }

    getCourse(id) {
        return this.courses.find(x => x.id === id)
    }

    getLatestGrades(open) {
        if (!open) open = false
        else if (open) viewController.overlay("show")
        return new Promise((resolve, reject) => {
            // logConsole("RAW:")
            // logConsole(JSON.stringify(this.raw))
            const url = `https://${school}/api/personen/${person.id}/cijfers/laatste?top=50&skip=0`
            // logConsole(url)
            $.ajax({
                    "dataType": "json",
                    "async": true,
                    "crossDomain": true,
                    "url": url,
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + tokens.access_token
                    },
                    "error": function (XMLHttpRequest, textStatus, errorThrown) {
                        // alert(XMLHttpRequest.statusText)
                        if (XMLHttpRequest.readyState == 4) {
                            logConsole("[ERROR] HTTP error (can be checked by XMLHttpRequest.status and XMLHttpRequest.statusText)")
                        } else if (XMLHttpRequest.readyState == 0) {
                            logConsole("[ERROR] Network error (i.e. connection refused, access denied due to CORS, etc.)")
                            reject("no internet")
                        } else {
                            logConsole("[ERROR] something weird is happening")
                        }
                    },
                    "timeout": 5000
                })
                .done((res) => {
                    var grades = res.Items || res.items
                    // alert(JSON.stringify(grades))
                    // grades = _.reject(grades, raw => raw.CijferId === 0)
                    this.latestGrades = grades
                    viewController.setLatestGrades(this.latestGrades, open)
                    resolve(this.latestGrades)
                })
        })
    }
}