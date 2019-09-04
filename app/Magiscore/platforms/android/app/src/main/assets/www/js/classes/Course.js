class Course {
    /**
     * @private
     * @param {Magister} magister
     * @param {Object} raw
     */
    constructor(magister, raw) {

        //super(magister)
        this._magister = magister

        /**
         * @type {String}
         * @readonly
         */
        this.id = toString(raw.Id)

        /**
         * @type {Date}
         * @readonly
         */
        this.start = parseDate(raw.Start)
        /**
         * @type {Date}
         * @readonly
         */
        this.end = parseDate(raw.Einde)

        /**
         * The school year of this course, e.g: '1617'
         * @type {String}
         * @readonly
         */
        this.schoolPeriod = raw.Lesperiode

        /**
         * Basic type information of this course, e.g: { description: "VWO 6", id: 420 }
         * @type {{ description: String, id: Number }}
         * @readonly
         */
        this.type = ({
            id: raw.Studie.Id,
            description: raw.Studie.Omschrijving,
        })

        /**
         * The group of this course, e.g: { description: "Klas 6v3", id: 420, locationId: 0 }
         * @type {{ description: String, id: Number, LocatieId: Number }}
         * @readonly
         */
        this.group = {
            id: raw.Groep.Id,
            description: raw.Groep.Omschrijving,
            // description() {
            //     const group = raw.Groep.Omschrijving
            //     return group != null ?
            //         group.split(' ').find(w => /\d/.test(w)) || group :
            //         null
            // },
            locationId: raw.Groep.LocatieId,
        }
        // logConsole(JSON.stringify(this.group))

        /**
         * @type {String[]}
         * @readonly
         */
        this.curricula = _.compact([raw.Profiel, raw.Profiel2])
        //logConsole("curricula " + this.curricula)

        /**
         * @type {Object[]}
         * @readonly
         */
        this.raw = raw

        /**
         * @type {Object[]}
         * @readonly
         */
        this.classes = []

        /**
         * @type {Object[]}
         * @readonly
         */
        this.grades = []
    }

    /**
     * @type {boolean}
     * @readonly
     */
    current() {
        const now = new Date()
        return this.start <= now && now <= this.end
    }

    /**
     * @returns {Promise<Object[]>}
     */
    getClasses() {
        return new Promise((resolve, reject) => {
            // logConsole("person id " + this._magister.person.id)
            const url = `https://${this._magister.tenant}/api/personen/${this._magister.person.id}/aanmeldingen/${this.id}/vakken`
            $.ajax({
                    "dataType": "json",
                    "async": true,
                    "crossDomain": true,
                    "url": url,
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + this._magister.token
                    },
                    "error": function (request, status, error) {
                        reject(error)
                    }
                })
                .done((res) => {
                    resolve(res.map(c => new Class(this._magister, c)))
                })
        })
    }

    /**
     * @param {Object} [options={}]
     * 	@param {boolean} [options.fillGrades=true]
     *  @param {boolean} [options.latest=false]
     * @returns {Promise<Grade[]>}
     */
    getGrades({
        fillGrades = true,
        latest = false
    } = {}) {
        return new Promise((resolve, reject) => {
            // logConsole("RAW:")
            // logConsole(JSON.stringify(this.raw))
            var date = this.current() ? formatDate(new Date()) : this.raw.Einde
            const urlPrefix = `https://${this._magister.tenant}/api/personen/${this._magister.person.id}/aanmeldingen/${this.id}/cijfers`
            const url = latest ?
                `https://${this._magister.tenant}/api/personen/${this._magister.person.id}/cijfers/laatste?top=50&skip=0` :
                `${urlPrefix}/cijferoverzichtvooraanmelding?actievePerioden=false&alleenBerekendeKolommen=false&alleenPTAKolommen=false&peildatum=${date}`
            // logConsole(url)
            $.ajax({
                    "dataType": "json",
                    "async": true,
                    "crossDomain": true,
                    "url": url,
                    "method": "GET",
                    "headers": {
                        "Authorization": "Bearer " + this._magister.token
                    },
                    "error": function (request, status, error) {
                        reject(error)
                    }
                })
                .done((res) => {
                    var grades = res.Items || res.items
                    grades = _.reject(grades, raw => raw.CijferId === 0)
                    grades = grades.map(raw => {
                        const grade = new Grade(this._magister, raw, this.id)
                        grade._fillUrl = `${urlPrefix}/extracijferkolominfo/${_.get(raw, 'CijferKolom.Id')}`
                        raw = grade
                        return grade
                    })
                    logConsole(JSON.stringify(grades[0]))
                    // grades.forEach(grade => {
                    //     grade._filled = false;
                    //     grade._filling = false;
                    //     while (!grade._filled) {
                    //         if (!grade._filling && !this._magister.timedOut) {
                    //             grade.fill()
                    //         }
                    //     }

                    // });

                    const promises = grades.map(raw => {
                        const grade = new Grade(this._magister, raw, this.id)
                        grade._fillUrl = `${urlPrefix}/extracijferkolominfo/${_.get(raw, 'CijferKolom.Id')}`
                        //errorConsole(grade._fillUrl)
                        return fillGrades ? grade.fill() : grade
                    })
                    Promise.all(promises).then(grades => {
                        resolve(grades)
                    })
                })
        })

    }
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}