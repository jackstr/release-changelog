"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const readline = __importStar(require("readline"));
const util_1 = require("util");
const compare_versions_1 = __importDefault(require("compare-versions"));
const moment_1 = __importDefault(require("moment"));
const lib = __importStar(require("./lib"));
const writeFile = util_1.promisify(fs.writeFile);
const readFile = util_1.promisify(fs.readFile);
class ShRes {
    constructor(stdOut, stdErr, error) {
        this.stdOut = stdOut;
        this.stdErr = stdErr;
        this.error = error;
    }
    *lines() {
        for (let line of this.stdOut.split('\n')) {
            line = line.trim();
            if (line.length) {
                yield line;
            }
        }
    }
}
function shArg(arg) {
    arg = String(arg).replace(/[^\\]'/g, function (m, i, s) {
        return m.slice(0, 1) + '\\\'';
    });
    return "'" + arg + "'";
}
async function sh(cmd) {
    //const promisifiedExec = util.promisify(exec);
    // const {stdout, stderr} = await promisifiedExec(cmd);
    return new Promise(function (resolve, reject) {
        child_process_1.exec(cmd, function (error, stdOut, stdErr) {
            if (error) {
                reject(new ShRes(stdOut, stdErr, error));
            }
            else {
                resolve(new ShRes(stdOut, stdErr));
            }
        });
    });
}
function releaseIt() {
    return __asyncGenerator(this, arguments, function* releaseIt_1() {
        var e_1, _a;
        // https://octokit.github.io/rest.js/v18
        const client = githubClient();
        try {
            for (var _b = __asyncValues(client.paginate.iterator(client.repos.listReleases, Object.assign(github.context.repo, { per_page: conf().pageSize }))), _c; _c = yield __await(_b.next()), !_c.done;) {
                const response = _c.value;
                if (response.data) {
                    for (const k in response.data) {
                        yield yield __await(response.data[k]);
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
function githubClient() {
    const client = lib.memoize(function () {
        const token = conf().token;
        const octokit = github.getOctokit(token);
        return Object.assign(octokit, { repoMeta: github.context.repo });
    });
    return client();
}
function tagIt() {
    return __asyncGenerator(this, arguments, function* tagIt_1() {
        const res = yield __await(shInSrcDir('git for-each-ref --sort=creatordate --format \'%(refname) %(objectname) %(creatordate)\' refs/tags'));
        for (const line of res.lines()) {
            const chunks = line.split(/\s+/);
            const [tagRef, commit, dayOfWeek, month, dayOfMonth, time, year, tzOffset] = chunks;
            const dateTime_ = dayOfWeek + ', ' + dayOfMonth + ' ' + month + ' ' + year + ' ' + time + ' ' + tzOffset;
            const dateTime = moment_1.default(dateTime_).utc().format();
            const match = tagRef.match(/^refs\/tags\/(?<tag>[^\s]+)$/);
            if (!match) {
                throw new Error();
            }
            yield yield __await({
                name: match.groups.tag,
                commit: commit,
                dateTime: dateTime,
            });
        }
    });
}
async function shInSrcDir(cmd) {
    return sh('cd ' + shArg(conf().srcDirPath) + '; ' + cmd);
}
function conf() {
    const changelogFilePath = process.cwd() + '/CHANGELOG.md';
    return {
        changelogFilePath: changelogFilePath,
        srcDirPath: path.dirname(changelogFilePath),
        pageSize: 100,
        debug: true,
        ownerAndRepo: 'jackstr/seamly2d',
        token: (core.getInput('token') || process.env.GITHUB_TOKEN)
    };
}
async function processFileLines(filePath, fn) {
    var e_2, _a;
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    try {
        for (var rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = await rl_1.next(), !rl_1_1.done;) {
            const line = rl_1_1.value;
            let res = fn(line);
            if (res !== undefined && res !== false) {
                return res;
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (rl_1_1 && !rl_1_1.done && (_a = rl_1.return)) await _a.call(rl_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
function tagsFilter(tag) {
    return (isVerTag(tag.name) || isWeeklyTag(tag.name)) && !tag.name.match(/\btest\b/);
}
async function findTags() {
    var e_3, _a;
    const tagFromFile = await processFileLines(conf().changelogFilePath, (line) => {
        if (!line.length) {
            return false;
        }
        if (lib.SemverHeader.match(line)) {
            return new lib.SemverHeader(line);
        }
        if (lib.WeeklyVerHeader.match(line)) {
            return new lib.WeeklyVerHeader(line);
        }
        return false;
    });
    const useTag = (tag) => {
        if (tag.name === tagFromFile.tag()) {
            return true;
        }
        if (tagFromFile instanceof lib.SemverHeader) {
            try {
                return compare_versions_1.default.compare(tag.name, tagFromFile.tag(), '>=');
            }
            catch (error) {
                return false;
            }
        }
        if (tagFromFile instanceof lib.WeeklyVerHeader && tag.name.match(/^weekly-\d+$/)) {
            return tag.name >= tagFromFile.tag();
        }
        return false;
    };
    core.info('Found tag in the Changelog file: ' + tagFromFile.val);
    let tags = [];
    let latestTag = null;
    try {
        for (var _b = __asyncValues(tagIt()), _c; _c = await _b.next(), !_c.done;) {
            const tag = _c.value;
            if (!tagFromFile) {
                latestTag = tag;
            }
            else if (!tags.length && useTag(tag)) { // add tags when the first interesting tag was found.
                tags.push(tag);
            }
            else if (tags.length) { // first tag found
                tags.push(tag);
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
        }
        finally { if (e_3) throw e_3.error; }
    }
    if (!tagFromFile && latestTag) { // tag not found in the file use latest one from repo
        tags.push(latestTag);
    }
    tags = tags.filter(tagsFilter);
    core.info('Found ' + tags.length + ' tag(s): [' + tags.map(tag => tag.name).join(', ') + ']');
    return tags;
}
/*
async function findCommits(startTag: Tag, endTag: Tag) {
    return (await shInSrcDir('git log --pretty=format:"%H" ' + shArg(startTag.name) + '..' + shArg(endTag.name))).lines();
}
*/
function issuesFilter(issue) {
    const havingLabels = (issue) => {
        const allowedLabels = ['enhancement', 'bug', 'build'];
        for (const label of issue.labels) {
            if (!allowedLabels.includes(label.name)) {
                return false;
            }
        }
        return true;
    };
    return havingLabels(issue);
}
async function findIssues(startTag, endTag) {
    var e_4, _a;
    let issues = [];
    if (conf().debug && fs.existsSync(__dirname + '/issues.json')) {
        issues = require(__dirname + '/issues.json').items;
    }
    else {
        const startDate = startTag.dateTime;
        const endDate = endTag.dateTime;
        const client = githubClient();
        // https://api.github.com/search/issues?q=repo:FashionFreedom/Seamly2D%20state:closed%20linked:pr%20closed:2020-07-30T13:38:42Z..2020-08-20T23:49:01Z
        // https://docs.github.com/en/github/searching-for-information-on-github/searching-issues-and-pull-requests#search-by-when-an-issue-or-pull-request-was-closed
        const q = `repo:${client.repoMeta.owner}/${client.repoMeta.repo} state:closed linked:pr closed:${startDate}..${endDate}`;
        core.info('Search issues query: ' + q);
        try {
            for (var _b = __asyncValues(client.paginate.iterator("GET /search/issues", {
                q: q,
                per_page: conf().pageSize,
            })), _c; _c = await _b.next(), !_c.done;) {
                const response = _c.value;
                if (response.data) {
                    for (const item of response.data) {
                        if (item.url) {
                            issues.push(item);
                        }
                    }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }
    core.info('Got ' + issues.length + ' issue(s) before filtering: [' + issues.map(issue => issue.number).join(', ') + ']');
    issues = issues.filter(issuesFilter);
    core.info('Got ' + issues.length + ' issue(s) after filtering: [' + issues.map(issue => issue.number).join(', ') + ']');
    return issues;
}
async function preparePullReq() {
    const tags = await findTags();
    if (!tags.length) {
        return false;
    }
    tags.push({ name: 'HEAD', commit: 'HEAD', dateTime: moment_1.default(moment_1.default.now()).utc().format() });
    // Now must be at least 2 tags: starting tag and HEAD
    const issues = await findIssues(tags[0], tags[tags.length - 1]);
    const pullReqParts = [];
    const issuesMap = {};
    for (const issue of issues) {
        issuesMap[issue.closed_at] = issue;
    }
    const issueDates = Object.keys(issuesMap);
    function findIssuesForTags(startTag, endTag) {
        const startDate = startTag.dateTime;
        const endDate = endTag.dateTime;
        const issuesForTags = [];
        for (const issueDate of issueDates) {
            if (issueDate >= startDate && issueDate <= endDate) {
                issuesForTags.push(issuesMap[issueDate]);
            }
        }
        return issuesForTags;
    }
    for (let i = 1; i < tags.length; i++) {
        const startTag = tags[i - 1], endTag = tags[i];
        const issues = findIssuesForTags(startTag, endTag);
        const pullReqPart = {
            tags: [startTag, endTag],
            issues: issues
        };
        pullReqParts.push(pullReqPart);
        /*
        const commits = Array.from(await findCommits(startAndEndTags[0], startAndEndTags[1]));
        core.info('Found ' +  commits.length + ' commit(s) from ' + startAndEndTags[0].name + '..' + startAndEndTags[1].name + ': [' + commits.toString().replace(/,/g, ', ') + ']');
        */
    }
    return {
        parts: pullReqParts.reverse()
    };
}
async function updateChangelogFile(pullReq) {
    const changelogFilePath = conf().changelogFilePath;
    let newText = '';
    if (fs.existsSync(changelogFilePath)) {
        const oldText = await readFile(changelogFilePath, 'utf8');
        newText = pullReq.text.trim();
        if (newText.length) {
            newText = newText + "\n\n" + oldText;
        }
    }
    else {
        newText = pullReq.text.trim();
    }
    if (newText.length) {
        await writeFile(changelogFilePath, newText);
    }
}
function isVerTag(tagName) {
    return !!tagName.match(/^v\d+\.\d+\.\d+/);
}
function isWeeklyTag(tagName) {
    return tagName.startsWith('weekly-');
}
async function renderPullReqText(pullReq) {
    function incTagVersion(tagName) {
        const match = tagName.match(/(?<before>.*\b)(?<ver>\d+)(?<after>\b.*)/);
        if (match) {
            return match.groups.before + (Number(match.groups.ver) + 1) + match.groups.after;
        }
        return tagName;
    }
    function renderTagName(tagName, prevVer) {
        if (tagName === 'HEAD') {
            return renderTagName(incTagVersion(prevVer), null);
        }
        if (isVerTag(tagName)) {
            return 'Version ' + tagName;
        }
        if (isWeeklyTag(tagName)) {
            return 'Weekly ' + tagName.substr(tagName.indexOf('-') + 1);
        }
        return tagName;
    }
    async function findPrevVer() {
        var e_5, _a;
        let prevVer = null;
        for (const pullReqPart of pullReq.parts) {
            const [startTag, endTag] = pullReqPart.tags;
            if (isVerTag(startTag.name)) {
                prevVer = startTag.name;
                break;
            }
        }
        if (null === prevVer) {
            try {
                for (var _b = __asyncValues(tagIt()), _c; _c = await _b.next(), !_c.done;) {
                    const tag = _c.value;
                    if (isVerTag(tag.name)) {
                        prevVer = tag.name;
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        if (null === prevVer) {
            prevVer = 'v0.0.1';
        }
        return prevVer;
    }
    const prevVer = await findPrevVer();
    let pullReqText = '';
    for (const pullReqPart of pullReq.parts) {
        const [startTag, endTag] = pullReqPart.tags;
        if (pullReqPart.issues.length) {
            pullReqText += (pullReqText.length ? "\n" : "") + '## ' + renderTagName(endTag.name, prevVer) + '\n\n';
            for (const issue of pullReqPart.issues) {
                pullReqText += '* [#' + issue.number + '](' + issue.html_url + ') ' + issue.title.trimEnd() + "\n";
            }
        }
    }
    pullReq.text = pullReqText.length ? pullReqText.trimEnd() + "\n" : '';
    return pullReq;
}
async function main() {
    try {
        core.setSecret(conf().token);
        await shInSrcDir('git fetch --tags');
        let pullReq = await preparePullReq();
        if (false !== pullReq) {
            core.info('Modifying the Changelog file');
            pullReq = await renderPullReqText(pullReq);
            await updateChangelogFile(pullReq);
        }
        else {
            core.info('Ignoring modification of the Changelog file');
        }
    }
    catch (error) {
        if (conf().debug) {
            console.log(error);
        }
        core.setFailed(error.message);
    }
}
/*
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
*/
main();
//# sourceMappingURL=index.js.map