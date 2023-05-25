const axios = require ("axios");
exports.getJWT = async (hostname, username, password) => {
    
        let request = {
            url: `https://${hostname}/wp-json/jwt-auth/v1/token`,
            method: "POST",
            withCredentials: false,
            headers: {
                'Content-Type': 'application/json',
                'Accept': "*/*"
            },
            data: {
                username,
                password
            }
        }

        let response;
        try {
            response = await axios(request);
        } catch (err) {
            console.error(err);
            return false;
        }

        return response.data;
}

exports.getTagId = async (hostname, username, password, tagName) => {
   
    let request = {
        url: `https://${hostname}/wp-json/wp/v2/tags`,
        method: "GET",
        params: {
           slug: tagName.toLowerCase().replaceAll(' ', '-').trim()
        }
    }

    console.log(request);

    let response;

    try {
        response = await axios(request);
    } catch (err) {
        console.error(err);
        return false;
    }

    let tags = response.data;

    /*
     * If the tag exists then return the id
     */
    if (tags.length) return tags[0].id;

    /*
     * If the tag does not exist then create it
     */

    const token  = await exports.getJWT(hostname, username, password);
    if (token === false) return false;

    request = {
        url: `https://${hostname}/wp-json/wp/v2/tags`,
        method: "POST",
        withCredentials: false,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.token}`
        },
        data: {
            name: tagName,
            slug: tagName.toLowerCase().replaceAll(' ', '-').trim()
        }
    }

    console.log(request);

    try {
        response = await axios(request);
    } catch (err) {
        console.error(err);
        return false;
    }

    console.log(response.data);
  
    return Number(response.data.id);
}

exports.createPost = async (hostname, username, password, title, content, tagNames = [], suggestedTitles = ['title 1', 'title 2'], status = 'draft') => {
    let token, request, response;

    let tagIds = [];

    if (tagNames.length) {
        for (let i = 0; i < tagNames.length; ++i) {
            const tagId = await exports.getTagId (hostname, username, password, tagNames[i]);
            tagIds.push(tagId);
        }
        
    }

    token = await exports.getJWT(hostname, username, password);

    request = {
        url: `https://${hostname}/wp-json/wp/v2/posts`,
        method: "POST",
        withCredentials: false,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token.token}`
        },
        data: {
            title, content, status,
            acf: {
                suggested_titles: suggestedTitles.join("\n")
            }
        }
    }

    if (tagNames.length) request.data.tags = tagIds;

    console.log(request);

    try {
        response = await axios(request);
        console.log(response.data);
    } catch (err) {
        console.error(err);
        return false;
    }

    return response.data.id;
}

