import { put, del } from "@vercel/blob"

export const uploadImage = async ({filename, image}: {filename?:string, image?: File | undefined}) => {
    try{
        if(!filename && !image){
            return { 
                message: "error lors de l upload",
                url: null
            }
        }
        const blob = await put(filename as string, image as File, {
                access: 'public' /* or 'public' */,
                addRandomSuffix: true,
              })

        if(!blob){
            return { 
                message: "Echec de l'upload",
                url: null
            }
        }
        
        return { 
            message: "Upload réussi",
            url: blob.url
        }
    }
    catch(error){
        return {
            message: `Echec de l'upload ${error}`,
            url: null
        }
    }   
}

export const deleteImage = async (url: string) => {
    try {
        if (!url) return { ok: true };
        await del(url);
        return { ok: true, message: "Suppression réussie" };
    } catch (error) {
        console.error("Erreur lors de la suppression de l'image:", error);
        return { ok: false, message: `Echec de la suppression: ${error}` };
    }
};

export const deleteImages = async (urls: string[]) => {
    try {
        const validUrls = urls.filter(url => !!url);
        if (validUrls.length === 0) return { ok: true };
        await del(validUrls);
        return { ok: true, message: "Suppressions réussies" };
    } catch (error) {
        console.error("Erreur lors de la suppression des images:", error);
        return { ok: false, message: `Echec de la suppression: ${error}` };
    }
};

