import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings"
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, UserStore } from "@webpack/common";
import { sendBotMessage } from "@api/Commands";

const PopOverIcon = () => {
    return <svg
        fill="var(--header-secondary)"
        width={24} height={24}
        viewBox={"0 0 64 64"}
    >
        <path d="M 32 9 C 24.832 9 19 14.832 19 22 L 19 27.347656 C 16.670659 28.171862 15 30.388126 15 33 L 15 49 C 15 52.314 17.686 55 21 55 L 43 55 C 46.314 55 49 52.314 49 49 L 49 33 C 49 30.388126 47.329341 28.171862 45 27.347656 L 45 22 C 45 14.832 39.168 9 32 9 z M 32 13 C 36.963 13 41 17.038 41 22 L 41 27 L 23 27 L 23 22 C 23 17.038 27.037 13 32 13 z" />
    </svg> ;
}
/*
const ChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Encrypt Message"
            onClick={() => buildEncModal()}

            buttonProps={{
                "aria-haspopup": "dialog",
            }}
        >
            <svg
                aria-hidden
                role="img"
                width="20"
                height="20"
                viewBox={"0 0 64 64"}
                style={{ scale: "1.39", translate: "0 -1px" }}
            >
                <path fill="currentColor" d="M 32 9 C 24.832 9 19 14.832 19 22 L 19 27.347656 C 16.670659 28.171862 15 30.388126 15 33 L 15 49 C 15 52.314 17.686 55 21 55 L 43 55 C 46.314 55 49 52.314 49 49 L 49 33 C 49 30.388126 47.329341 28.171862 45 27.347656 L 45 22 C 45 14.832 39.168 9 32 9 z M 32 13 C 36.963 13 41 17.038 41 22 L 41 27 L 23 27 L 23 22 C 23 17.038 27.037 13 32 13 z" />
            </svg>
        </ChatBarButton>
    );
};
*/
const settings = definePluginSettings({
    defaultPassword: {
        type: OptionType.STRING,
        default: "",
        description: "The default encryption password."
    }
})

const BASE64_REGEX = new RegExp(/[A-Za-z0-9+\/]+={0,3}/g);

var CryptoJS;

export default definePlugin({
    name: "Encrypt",
    description: "Symetrically encrypt/decrypt text in Discord!",
    authors: [{name: "KendleMintJed", id: 308673958730006529n}],
    settings,

    start() {
        if (CryptoJS != undefined) return;

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
        script.onload = () => {CryptoJS = window.CryptoJS;}
        document.head.appendChild(script);
    },

    renderMessagePopoverButton(message) {
        return {
            label: "Decrypt Message",
            icon: PopOverIcon,
            message: message,
            channel: ChannelStore.getChannel(message.channel_id),
            onClick: async () => {
                if (!CryptoJS) {
                    sendBotMessage(
                        message.channel_id,
                        {
                            content: "Error: CryptoJS is undefined.",
                            author: UserStore.getCurrentUser(),
                        }
                    )
                    return;
                }

                const encrypted_messages = message?.content
                    .match(BASE64_REGEX)
                    ?.filter((match) => match.length >= 44
                        // is valid AES block size: 16 bytes or 64/3 characters padded to the nearest 4
                        && Math.ceil(Math.floor(match.length * 3 / 64) * 16 / 3 ) * 4 == match.length);

                const decrypted_messages = encrypted_messages.map(
                    (cipher_text) => CryptoJS.AES.decrypt(cipher_text, settings.store.defaultPassword).toString(CryptoJS.enc.Utf8)
                );

                const content = decrypted_messages
                    ? decrypted_messages .reduce(
                        (acc, match) => {return {content: `${acc.content}\nLink ${acc.i}: ${match}`, i: acc.i + 1}},
                        {content: "", i: 1}
                    ).content.trim()
                    : "No Base64 found."

                sendBotMessage(
                    message.channel_id,
                    {
                        content,
                        author: UserStore.getCurrentUser(),
                    }
                )
            }
        }
    },
})
