// excerpts from the Jedi Academy source code, GPLv2

#ifndef NULL
#define NULL ((void *)0)
#endif
#define MAX_QPATH 64
typedef struct
{
    char filename[MAX_QPATH];
    animation_t *anims;
    //	animsounds_t	torsoAnimSnds[MAX_ANIM_SOUNDS];
    //	animsounds_t	legsAnimSnds[MAX_ANIM_SOUNDS];
    //	qboolean		soundsCached;
} bgLoadedAnim_t;
#define MAX_ANIM_FILES 64
bgLoadedAnim_t bgAllAnims[MAX_ANIM_FILES];
int bgNumAllAnims = 2;
typedef enum
{
    qfalse,
    qtrue
} qboolean;
typedef int fileHandle_t;
typedef struct animation_s
{
    unsigned short firstFrame;
    unsigned short numFrames;
    short frameLerp; // msec between frames
    // initialLerp is abs(frameLerp)
    signed char loopFrames; // 0 to numFrames
} animation_t;
#define MAX_ANIMATIONS 1543 // originally the penultimate entry in the animNumber_t enum
#define MAX_TOTALANIMATIONS (MAX_ANIMATIONS + 1)
#define MAX_ANIM_EVENTS 300

// size of Anim eventData array...
#define MAX_RANDOM_ANIM_SOUNDS 4
#define AED_ARRAY_SIZE (MAX_RANDOM_ANIM_SOUNDS + 3)
// indices for AEV_SOUND data
#define AED_SOUNDINDEX_START 0
#define AED_SOUNDINDEX_END (MAX_RANDOM_ANIM_SOUNDS - 1)
#define AED_SOUND_NUMRANDOMSNDS (MAX_RANDOM_ANIM_SOUNDS)
#define AED_SOUND_PROBABILITY (MAX_RANDOM_ANIM_SOUNDS + 1)
// indices for AEV_SOUNDCHAN data
#define AED_SOUNDCHANNEL (MAX_RANDOM_ANIM_SOUNDS + 2)
// indices for AEV_FOOTSTEP data
#define AED_FOOTSTEP_TYPE 0
#define AED_FOOTSTEP_PROBABILITY 1
// indices for AEV_EFFECT data
#define AED_EFFECTINDEX 0
#define AED_BOLTINDEX 1
#define AED_EFFECT_PROBABILITY 2
#define AED_MODELINDEX 3
// indices for AEV_FIRE data
#define AED_FIRE_ALT 0
#define AED_FIRE_PROBABILITY 1
// indices for AEV_MOVE data
#define AED_MOVE_FWD 0
#define AED_MOVE_RT 1
#define AED_MOVE_UP 2
// indices for AEV_SABER_SWING data
#define AED_SABER_SWING_SABERNUM 0
#define AED_SABER_SWING_TYPE 1
#define AED_SABER_SWING_PROBABILITY 2
// indices for AEV_SABER_SPIN data
#define AED_SABER_SPIN_SABERNUM 0
#define AED_SABER_SPIN_TYPE 1 // 0 = saberspinoff, 1 = saberspin, 2-4 = saberspin1-saberspin3
#define AED_SABER_SPIN_PROBABILITY 2

animation_t bgHumanoidAnimations[MAX_TOTALANIMATIONS];
qboolean BGPAFtextLoaded = qfalse;
typedef struct stringID_table_s
{
    char *name;
    int id;
} stringID_table_t;
stringID_table_t animTable[MAX_ANIMATIONS + 1] =
    {
        // <all the animations>
        // ...
        // must be terminated
        NULL, -1};
typedef enum
{ // NOTENOTE:  Be sure to update animEventTypeTable and ParseAnimationEvtBlock(...) if you change this enum list!
    AEV_NONE,
    AEV_SOUND,       // # animID AEV_SOUND framenum soundpath randomlow randomhi chancetoplay
    AEV_FOOTSTEP,    // # animID AEV_FOOTSTEP framenum footstepType chancetoplay
    AEV_EFFECT,      // # animID AEV_EFFECT framenum effectpath boltName chancetoplay
    AEV_FIRE,        // # animID AEV_FIRE framenum altfire chancetofire
    AEV_MOVE,        // # animID AEV_MOVE framenum forwardpush rightpush uppush
    AEV_SOUNDCHAN,   // # animID AEV_SOUNDCHAN framenum CHANNEL soundpath randomlow randomhi chancetoplay
    AEV_SABER_SWING, // # animID AEV_SABER_SWING framenum CHANNEL randomlow randomhi chancetoplay
    AEV_SABER_SPIN,  // # animID AEV_SABER_SPIN framenum CHANNEL chancetoplay
    AEV_NUM_AEV
} animEventType_t;
typedef struct animevent_s
{
    animEventType_t eventType;
    unsigned short keyFrame;                // Frame to play event on
    signed short eventData[AED_ARRAY_SIZE]; // Unique IDs, can be soundIndex of sound file to play OR effect index or footstep type, etc.
    char *stringData;                       // we allow storage of one string, temporarily (in case we have to look up an index later, then make sure to set stringData to NULL so we only do the look-up once)
} animevent_t;
typedef struct
{
    char filename[MAX_QPATH];
    animevent_t torsoAnimEvents[MAX_ANIM_EVENTS];
    animevent_t legsAnimEvents[MAX_ANIM_EVENTS];
    qboolean eventsParsed;
} bgLoadedEvents_t;
typedef enum
{
    FS_READ,
    FS_WRITE,
    FS_APPEND,
    FS_APPEND_SYNC
} fsMode_t;
typedef enum
{
    ERR_FATAL,            // exit the entire game with a popup window
    ERR_DROP,             // print to console and disconnect from game
    ERR_SERVERDISCONNECT, // don't kill server
    ERR_DISCONNECT,       // client disconnected from the server
    ERR_NEED_CD           // pop up the need-cd dialog
} errorParm_t;
#define S_COLOR_RED "^1"
#define S_COLOR_YELLOW "^3"
#define ENUM2STRING(arg) #arg, arg
stringID_table_t animEventTypeTable[MAX_ANIM_EVENTS + 1] =
    {
        ENUM2STRING(AEV_SOUND),       // # animID AEV_SOUND framenum soundpath randomlow randomhi chancetoplay
        ENUM2STRING(AEV_FOOTSTEP),    // # animID AEV_FOOTSTEP framenum footstepType
        ENUM2STRING(AEV_EFFECT),      // # animID AEV_EFFECT framenum effectpath boltName
        ENUM2STRING(AEV_FIRE),        // # animID AEV_FIRE framenum altfire chancetofire
        ENUM2STRING(AEV_MOVE),        // # animID AEV_MOVE framenum forwardpush rightpush uppush
        ENUM2STRING(AEV_SOUNDCHAN),   // # animID AEV_SOUNDCHAN framenum CHANNEL soundpath randomlow randomhi chancetoplay
        ENUM2STRING(AEV_SABER_SWING), // # animID AEV_SABER_SWING framenum CHANNEL randomlow randomhi chancetoplay
        ENUM2STRING(AEV_SABER_SPIN),  // # animID AEV_SABER_SPIN framenum CHANNEL chancetoplay
        // must be terminated
        NULL, -1};
// sound channels
// channel 0 never willingly overrides
// other channels will allways override a playing sound on that channel
typedef enum
{
    CHAN_AUTO,         // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" # Auto-picks an empty channel to play sound on
    CHAN_LOCAL,        // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" # menu sounds, etc
    CHAN_WEAPON,       // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3"
    CHAN_VOICE,        // ## %s !!"W:\game\base\!!sound\voice\*.wav;*.mp3" # Voice sounds cause mouth animation
    CHAN_VOICE_ATTEN,  // ## %s !!"W:\game\base\!!sound\voice\*.wav;*.mp3" # Causes mouth animation but still use normal sound falloff
    CHAN_ITEM,         // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3"
    CHAN_BODY,         // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3"
    CHAN_AMBIENT,      // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" # added for ambient sounds
    CHAN_LOCAL_SOUND,  // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" #chat messages, etc
    CHAN_ANNOUNCER,    // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" #announcer voices, etc
    CHAN_LESS_ATTEN,   // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" #attenuates similar to chan_voice, but uses empty channel auto-pick behaviour
    CHAN_MENU1,        // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" #menu stuff, etc
    CHAN_VOICE_GLOBAL, // ## %s !!"W:\game\base\!!sound\voice\*.wav;*.mp3" # Causes mouth animation and is broadcast, like announcer
    CHAN_MUSIC,        // ## %s !!"W:\game\base\!!sound\*.wav;*.mp3" #music played as a looping sound - added by BTO (VV)
};
typedef int soundChannel_t;

typedef enum
{
    FOOTSTEP_R,
    FOOTSTEP_L,
    FOOTSTEP_HEAVY_R,
    FOOTSTEP_HEAVY_L,
    NUM_FOOTSTEP_TYPES
} footstepType_t;
stringID_table_t footstepTypeTable[NUM_FOOTSTEP_TYPES + 1] =
    {
        ENUM2STRING(FOOTSTEP_R),
        ENUM2STRING(FOOTSTEP_L),
        ENUM2STRING(FOOTSTEP_HEAVY_R),
        ENUM2STRING(FOOTSTEP_HEAVY_L),
        // must be terminated
        NULL, -1};

/*
======================
BG_ParseAnimationFile

Read a configuration file containing animation coutns and rates
models/players/visor/animation.cfg, etc

======================
*/
int BG_ParseAnimationFile(const char *filename, animation_t *animset, qboolean isHumanoid)
{
    char *text_p;
    int len;
    int i;
    char *token;
    float fps;
    int skip;
    int usedIndex = -1;
    int nextIndex = bgNumAllAnims;
    qboolean dynAlloc = qfalse;
    qboolean wasLoaded = qfalse;
#ifndef Q3_VM
    char BGPAFtext[60000];
#endif

    fileHandle_t f;
    int animNum;

    if (!isHumanoid)
    {
        i = 0;
        while (i < bgNumAllAnims)
        { // see if it's been loaded already
            if (!Q_stricmp(bgAllAnims[i].filename, filename))
            {
                animset = bgAllAnims[i].anims;
                return i; // alright, we already have it.
            }
            i++;
        }

        // Looks like it has not yet been loaded. Allocate space for the anim set if we need to, and continue along.
        if (!animset)
        {
            if (strstr(filename, "players/_humanoid/"))
            { // then use the static humanoid set.
                animset = bgHumanoidAnimations;
                nextIndex = 0;
            }
            else if (strstr(filename, "players/rockettrooper/"))
            { // rockettrooper always index 1
                nextIndex = 1;
                animset = BG_AnimsetAlloc();
                dynAlloc = qtrue; // so we know to free this memory in case we have to return early. Don't want any leaks.

                if (!animset)
                {
                    assert(!"Anim set alloc failed!");
                    return -1;
                }
            }
            else
            {
                animset = BG_AnimsetAlloc();
                dynAlloc = qtrue; // so we know to free this memory in case we have to return early. Don't want any leaks.

                if (!animset)
                {
                    assert(!"Anim set alloc failed!");
                    return -1;
                }
            }
        }
    }
#ifdef _DEBUG
    else
    {
        assert(animset);
    }
#endif

    // load the file
    if (!BGPAFtextLoaded || !isHumanoid)
    { // rww - We are always using the same animation config now. So only load it once.
        len = trap_FS_FOpenFile(filename, &f, FS_READ);
        if ((len <= 0) || (len >= sizeof(BGPAFtext) - 1))
        {
            if (dynAlloc)
            {
                BG_AnimsetFree(animset);
            }
            if (len > 0)
            {
                Com_Error(ERR_DROP, "%s exceeds the allowed game-side animation buffer!", filename);
            }
            return -1;
        }

        trap_FS_Read(BGPAFtext, len, f);
        BGPAFtext[len] = 0;
        trap_FS_FCloseFile(f);
    }
    else
    {
        if (dynAlloc)
        {
            assert(!"Should not have allocated dynamically for humanoid");
            BG_AnimsetFree(animset);
        }
        return 0; // humanoid index
    }

    // parse the text
    text_p = BGPAFtext;
    skip = 0; // quiet the compiler warning

    // FIXME: have some way of playing anims backwards... negative numFrames?

    // initialize anim array so that from 0 to MAX_ANIMATIONS, set default values of 0 1 0 100
    for (i = 0; i < MAX_ANIMATIONS; i++)
    {
        animset[i].firstFrame = 0;
        animset[i].numFrames = 0;
        animset[i].loopFrames = -1;
        animset[i].frameLerp = 100;
    }

    // read information for each frame
    while (1)
    {
        token = COM_Parse((const char **)(&text_p));

        if (!token || !token[0])
        {
            break;
        }

        animNum = GetIDForString(animTable, token);
        if (animNum == -1)
        {
// #ifndef FINAL_BUILD
#ifdef _DEBUG
            Com_Printf(S_COLOR_RED "WARNING: Unknown token %s in %s\n", token, filename);
            while (token[0])
            {
                token = COM_ParseExt((const char **)&text_p, qfalse); // returns empty string when next token is EOL
            }
#endif
            continue;
        }

        token = COM_Parse((const char **)(&text_p));
        if (!token)
        {
            break;
        }
        animset[animNum].firstFrame = atoi(token);

        token = COM_Parse((const char **)(&text_p));
        if (!token)
        {
            break;
        }
        animset[animNum].numFrames = atoi(token);

        token = COM_Parse((const char **)(&text_p));
        if (!token)
        {
            break;
        }
        animset[animNum].loopFrames = atoi(token);

        token = COM_Parse((const char **)(&text_p));
        if (!token)
        {
            break;
        }
        fps = atof(token);
        if (fps == 0)
        {
            fps = 1; // Don't allow divide by zero error
        }
        if (fps < 0)
        { // backwards
            animset[animNum].frameLerp = floor(1000.0f / fps);
        }
        else
        {
            animset[animNum].frameLerp = ceil(1000.0f / fps);
        }
    }
#ifdef CONVENIENT_ANIMATION_FILE_DEBUG_THING
    SpewDebugStuffToFile();
#endif

    wasLoaded = BGPAFtextLoaded;

    if (isHumanoid)
    {
        bgAllAnims[0].anims = animset;
        strcpy(bgAllAnims[0].filename, filename);
        BGPAFtextLoaded = qtrue;

        usedIndex = 0;
    }
    else
    {
        bgAllAnims[nextIndex].anims = animset;
        strcpy(bgAllAnims[nextIndex].filename, filename);

        usedIndex = bgNumAllAnims;

        if (nextIndex > 1)
        { // don't bother increasing the number if this ended up as a humanoid/rockettrooper load.
            bgNumAllAnims++;
        }
        else
        {
            BGPAFtextLoaded = qtrue;
            usedIndex = nextIndex;
        }
    }

    return usedIndex;
}

/*
======================
BG_ParseAnimationEvtFile

Read a configuration file containing animation events
models/players/kyle/animevents.cfg, etc

This file's presence is not required

======================
*/
bgLoadedEvents_t bgAllEvents[MAX_ANIM_FILES];
int bgNumAnimEvents = 1;
static int bg_animParseIncluding = 0;
int BG_ParseAnimationEvtFile(const char *as_filename, int animFileIndex, int eventFileIndex)
{
    const char *text_p;
    int len;
    const char *token;
    char text[80000];
    char sfilename[MAX_QPATH];
    fileHandle_t f;
    int i, j, upper_i, lower_i;
    int usedIndex = -1;
    animevent_t *legsAnimEvents;
    animevent_t *torsoAnimEvents;
    animation_t *animations;
    int forcedIndex;

    assert(animFileIndex < MAX_ANIM_FILES);
    assert(eventFileIndex < MAX_ANIM_FILES);

    if (animFileIndex < 0 || animFileIndex >= MAX_ANIM_FILES)
    { // WTF??!!
        return 0;
    }

    if (eventFileIndex < 0 || eventFileIndex >= MAX_ANIM_FILES)
    { // WTF??!!
        forcedIndex = 0;
    }
    else
    {
        forcedIndex = eventFileIndex;
    }

    if (bg_animParseIncluding <= 0)
    { // if we should be parsing an included file, skip this part
        if (bgAllEvents[forcedIndex].eventsParsed)
        { // already cached this one
            return forcedIndex;
        }
    }

    legsAnimEvents = bgAllEvents[forcedIndex].legsAnimEvents;
    torsoAnimEvents = bgAllEvents[forcedIndex].torsoAnimEvents;
    animations = bgAllAnims[animFileIndex].anims;

    if (bg_animParseIncluding <= 0)
    { // if we should be parsing an included file, skip this part
        // Go through and see if this filename is already in the table.
        i = 0;
        while (i < bgNumAnimEvents && forcedIndex != 0)
        {
            if (!Q_stricmp(as_filename, bgAllEvents[i].filename))
            { // looks like we have it already.
                return i;
            }
            i++;
        }
    }

    // Load and parse animevents.cfg file
    Com_sprintf(sfilename, sizeof(sfilename), "%sanimevents.cfg", as_filename);

    if (bg_animParseIncluding <= 0)
    { // should already be done if we're including
        // initialize anim event array
        for (i = 0; i < MAX_ANIM_EVENTS; i++)
        {
            // Type of event
            torsoAnimEvents[i].eventType = AEV_NONE;
            legsAnimEvents[i].eventType = AEV_NONE;
            // Frame to play event on
            torsoAnimEvents[i].keyFrame = -1;
            legsAnimEvents[i].keyFrame = -1;
            // we allow storage of one string, temporarily (in case we have to look up an index later, then make sure to set stringData to NULL so we only do the look-up once)
            torsoAnimEvents[i].stringData = NULL;
            legsAnimEvents[i].stringData = NULL;
            // Unique IDs, can be soundIndex of sound file to play OR effect index or footstep type, etc.
            for (j = 0; j < AED_ARRAY_SIZE; j++)
            {
                torsoAnimEvents[i].eventData[j] = -1;
                legsAnimEvents[i].eventData[j] = -1;
            }
        }
    }

    // load the file
    len = trap_FS_FOpenFile(sfilename, &f, FS_READ);
    if (len <= 0)
    { // no file
        goto fin;
    }
    if (len >= sizeof(text) - 1)
    {
        trap_FS_FCloseFile(f);
#ifndef FINAL_BUILD
        Com_Error(ERR_DROP, "File %s too long\n", sfilename);
#else
        Com_Printf("File %s too long\n", sfilename);
#endif
        goto fin;
    }

    trap_FS_Read(text, len, f);
    text[len] = 0;
    trap_FS_FCloseFile(f);

    // parse the text
    text_p = text;
    upper_i = 0;
    lower_i = 0;

    // read information for batches of sounds (UPPER or LOWER)
    while (1)
    {
        // Get base frame of sequence
        token = COM_Parse(&text_p);
        if (!token || !token[0])
        {
            break;
        }

        if (!Q_stricmp(token, "include")) // grab from another animevents.cfg
        {                                 // NOTE: you REALLY should NOT do this after the main block of UPPERSOUNDS and LOWERSOUNDS
            const char *include_filename = COM_Parse(&text_p);
            if (include_filename != NULL)
            {
                char fullIPath[MAX_QPATH];
                strcpy(fullIPath, va("models/players/%s/", include_filename));
                bg_animParseIncluding++;
                BG_ParseAnimationEvtFile(fullIPath, animFileIndex, forcedIndex);
                bg_animParseIncluding--;
            }
        }

        if (!Q_stricmp(token, "UPPEREVENTS")) // A batch of upper sounds
        {
            ParseAnimationEvtBlock(as_filename, torsoAnimEvents, animations, &upper_i, &text_p);
        }

        else if (!Q_stricmp(token, "LOWEREVENTS")) // A batch of lower sounds
        {
            ParseAnimationEvtBlock(as_filename, legsAnimEvents, animations, &lower_i, &text_p);
        }
    }

    usedIndex = forcedIndex;
fin:
    // Mark this anim set so that we know we tried to load he sounds, don't care if the load failed
    if (bg_animParseIncluding <= 0)
    { // if we should be parsing an included file, skip this part
        bgAllEvents[forcedIndex].eventsParsed = qtrue;
        strcpy(bgAllEvents[forcedIndex].filename, as_filename);
        if (forcedIndex)
        {
            bgNumAnimEvents++;
        }
    }

    return usedIndex;
}

void ParseAnimationEvtBlock(const char *aeb_filename, animevent_t *animEvents, animation_t *animations, int *i, const char **text_p)
{
    const char *token;
    int num, n, animNum, keyFrame, lowestVal, highestVal, curAnimEvent, lastAnimEvent = 0;
    animEventType_t eventType;
    char stringData[MAX_QPATH];

    // get past starting bracket
    while (1)
    {
        token = COM_Parse(text_p);
        if (!Q_stricmp(token, "{"))
        {
            break;
        }
    }

    // NOTE: instead of a blind increment, increase the index
    //			this way if we have an event on an anim that already
    //			has an event of that type, it stomps it

    // read information for each frame
    while (1)
    {
        if (lastAnimEvent >= MAX_ANIM_EVENTS)
        {
            Com_Error(ERR_DROP, "ParseAnimationEvtBlock: number events in animEvent file %s > MAX_ANIM_EVENTS(%i)", aeb_filename, MAX_ANIM_EVENTS);
            return;
        }
        // Get base frame of sequence
        token = COM_Parse(text_p);
        if (!token || !token[0])
        {
            break;
        }

        if (!Q_stricmp(token, "}")) // At end of block
        {
            break;
        }

        // Compare to same table as animations used
        //	so we don't have to use actual numbers for animation first frames,
        //	just need offsets.
        // This way when animation numbers change, this table won't have to be updated,
        //	at least not much.
        animNum = GetIDForString(animTable, token);
        if (animNum == -1)
        { // Unrecognized ANIM ENUM name, or we're skipping this line, keep going till you get a good one
            Com_Printf(S_COLOR_YELLOW "WARNING: Unknown token %s in animEvent file %s\n", token, aeb_filename);
            while (token[0])
            {
                token = COM_ParseExt(text_p, qfalse); // returns empty string when next token is EOL
            }
            continue;
        }

        if (animations[animNum].numFrames == 0)
        { // we don't use this anim
            Com_Printf(S_COLOR_YELLOW "WARNING: %s animevents.cfg: anim %s not used by this model\n", aeb_filename, token);
            // skip this entry
            SkipRestOfLine(text_p);
            continue;
        }

        token = COM_Parse(text_p);
        eventType = (animEventType_t)GetIDForString(animEventTypeTable, token);
        if (eventType == AEV_NONE || eventType == -1)
        { // Unrecognized ANIM EVENT TYOE, or we're skipping this line, keep going till you get a good one
            // Com_Printf(S_COLOR_YELLOW"WARNING: Unknown token %s in animEvent file %s\n", token, aeb_filename );
            continue;
        }

        // set our start frame
        keyFrame = animations[animNum].firstFrame;
        // Get offset to frame within sequence
        token = COM_Parse(text_p);
        if (!token)
        {
            break;
        }
        keyFrame += atoi(token);

        // see if this frame already has an event of this type on it, if so, overwrite it
        curAnimEvent = CheckAnimFrameForEventType(animEvents, keyFrame, eventType);
        if (curAnimEvent == -1)
        { // this anim frame doesn't already have an event of this type on it
            curAnimEvent = lastAnimEvent;
        }

        // now that we know which event index we're going to plug the data into, start doing it
        animEvents[curAnimEvent].eventType = eventType;
        animEvents[curAnimEvent].keyFrame = keyFrame;

        // now read out the proper data based on the type
        switch (animEvents[curAnimEvent].eventType)
        {
        case AEV_SOUNDCHAN: // # animID AEV_SOUNDCHAN framenum CHANNEL soundpath randomlow randomhi chancetoplay
            token = COM_Parse(text_p);
            if (!token)
            {
                break;
            }
            if (stricmp(token, "CHAN_VOICE_ATTEN") == 0)
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_VOICE_ATTEN;
            }
            else if (stricmp(token, "CHAN_VOICE_GLOBAL") == 0)
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_VOICE_GLOBAL;
            }
            else if (stricmp(token, "CHAN_ANNOUNCER") == 0)
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_ANNOUNCER;
            }
            else if (stricmp(token, "CHAN_BODY") == 0)
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_BODY;
            }
            else if (stricmp(token, "CHAN_WEAPON") == 0)
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_WEAPON;
            }
            else if (stricmp(token, "CHAN_VOICE") == 0)
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_VOICE;
            }
            else
            {
                animEvents[curAnimEvent].eventData[AED_SOUNDCHANNEL] = CHAN_AUTO;
            }
            // fall through to normal sound
        case AEV_SOUND: // # animID AEV_SOUND framenum soundpath randomlow randomhi chancetoplay
            // get soundstring
            token = COM_Parse(text_p);
            if (!token)
            {
                break;
            }
            strcpy(stringData, token);
            // get lowest value
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            lowestVal = atoi(token);
            // get highest value
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            highestVal = atoi(token);
            // Now precache all the sounds
            // NOTE: If we can be assured sequential handles, we can store sound indices
            //		instead of strings, unfortunately, if these sounds were previously
            //		registered, we cannot be guaranteed sequential indices.  Thus an array
            if (lowestVal && highestVal)
            {
                // assert(highestVal - lowestVal < MAX_RANDOM_ANIM_SOUNDS);
                if ((highestVal - lowestVal) >= MAX_RANDOM_ANIM_SOUNDS)
                {
                    highestVal = lowestVal + (MAX_RANDOM_ANIM_SOUNDS - 1);
                }
                for (n = lowestVal, num = AED_SOUNDINDEX_START; n <= highestVal && num <= AED_SOUNDINDEX_END; n++, num++)
                {
                    if (stringData[0] == '*')
                    { // FIXME? Would be nice to make custom sounds work with animEvents.
                        animEvents[curAnimEvent].eventData[num] = 0;
                    }
                    else
                    {
                        animEvents[curAnimEvent].eventData[num] = trap_S_RegisterSound(va(stringData, n));
                    }
                }
                animEvents[curAnimEvent].eventData[AED_SOUND_NUMRANDOMSNDS] = num - 1;
            }
            else
            {
                if (stringData[0] == '*')
                { // FIXME? Would be nice to make custom sounds work with animEvents.
                    animEvents[curAnimEvent].eventData[AED_SOUNDINDEX_START] = 0;
                }
                else
                {
                    animEvents[curAnimEvent].eventData[AED_SOUNDINDEX_START] = trap_S_RegisterSound(stringData);
                }
#ifndef FINAL_BUILD
                if (!animEvents[curAnimEvent].eventData[AED_SOUNDINDEX_START] &&
                    stringData[0] != '*')
                { // couldn't register it - file not found
                    Com_Printf(S_COLOR_RED "ParseAnimationSndBlock: sound %s does not exist (animevents.cfg %s)!\n", stringData, aeb_filename);
                }
#endif
                animEvents[curAnimEvent].eventData[AED_SOUND_NUMRANDOMSNDS] = 0;
            }
            // get probability
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_SOUND_PROBABILITY] = atoi(token);

            // last part - cheat and check and see if it's a special overridable saber sound we know of...
            if (!Q_stricmpn("sound/weapons/saber/saberhup", stringData, 28))
            { // a saber swing
                animEvents[curAnimEvent].eventType = AEV_SABER_SWING;
                animEvents[curAnimEvent].eventData[AED_SABER_SWING_SABERNUM] = 0; // since we don't know which one they meant if we're hacking this, always use first saber
                animEvents[curAnimEvent].eventData[AED_SABER_SWING_PROBABILITY] = animEvents[curAnimEvent].eventData[AED_SOUND_PROBABILITY];
                if (lowestVal < 4)
                {                                                                 // fast swing
                    animEvents[curAnimEvent].eventData[AED_SABER_SWING_TYPE] = 0; // SWING_FAST;
                }
                else if (lowestVal < 7)
                {                                                                 // medium swing
                    animEvents[curAnimEvent].eventData[AED_SABER_SWING_TYPE] = 1; // SWING_MEDIUM;
                }
                else
                {                                                                 // strong swing
                    animEvents[curAnimEvent].eventData[AED_SABER_SWING_TYPE] = 2; // SWING_STRONG;
                }
            }
            else if (!Q_stricmpn("sound/weapons/saber/saberspin", stringData, 29))
            { // a saber spin
                animEvents[curAnimEvent].eventType = AEV_SABER_SPIN;
                animEvents[curAnimEvent].eventData[AED_SABER_SPIN_SABERNUM] = 0; // since we don't know which one they meant if we're hacking this, always use first saber
                animEvents[curAnimEvent].eventData[AED_SABER_SPIN_PROBABILITY] = animEvents[curAnimEvent].eventData[AED_SOUND_PROBABILITY];
                if (stringData[29] == 'o')
                { // saberspinoff
                    animEvents[curAnimEvent].eventData[AED_SABER_SPIN_TYPE] = 0;
                }
                else if (stringData[29] == '1')
                { // saberspin1
                    animEvents[curAnimEvent].eventData[AED_SABER_SPIN_TYPE] = 2;
                }
                else if (stringData[29] == '2')
                { // saberspin2
                    animEvents[curAnimEvent].eventData[AED_SABER_SPIN_TYPE] = 3;
                }
                else if (stringData[29] == '3')
                { // saberspin3
                    animEvents[curAnimEvent].eventData[AED_SABER_SPIN_TYPE] = 4;
                }
                else if (stringData[29] == '%')
                { // saberspin%d
                    animEvents[curAnimEvent].eventData[AED_SABER_SPIN_TYPE] = 5;
                }
                else
                { // just plain saberspin
                    animEvents[curAnimEvent].eventData[AED_SABER_SPIN_TYPE] = 1;
                }
            }
            break;
        case AEV_FOOTSTEP: // # animID AEV_FOOTSTEP framenum footstepType
            // get footstep type
            token = COM_Parse(text_p);
            if (!token)
            {
                break;
            }
            animEvents[curAnimEvent].eventData[AED_FOOTSTEP_TYPE] = GetIDForString(footstepTypeTable, token);
            // get probability
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_FOOTSTEP_PROBABILITY] = atoi(token);
            break;
        case AEV_EFFECT: // # animID AEV_EFFECT framenum effectpath boltName
            // get effect index
            token = COM_Parse(text_p);
            if (!token)
            {
                break;
            }
            animEvents[curAnimEvent].eventData[AED_EFFECTINDEX] = trap_FX_RegisterEffect(token);
            // get bolt index
            token = COM_Parse(text_p);
            if (!token)
            {
                break;
            }
            if (Q_stricmp("none", token) != 0 && Q_stricmp("NULL", token) != 0)
            { // actually are specifying a bolt to use
                if (!animEvents[curAnimEvent].stringData)
                { // eh, whatever. no dynamic stuff, so this will do.
                    animEvents[curAnimEvent].stringData = (char *)BG_Alloc(2048);
                }
                strcpy(animEvents[curAnimEvent].stringData, token);
            }
            // NOTE: this string will later be used to add a bolt and store the index, as below:
            // animEvent->eventData[AED_BOLTINDEX] = gi.G2API_AddBolt( &cent->gent->ghoul2[cent->gent->playerModel], animEvent->stringData );
            // get probability
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_EFFECT_PROBABILITY] = atoi(token);
            break;
        case AEV_FIRE: // # animID AEV_FIRE framenum altfire chancetofire
            // get altfire
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_FIRE_ALT] = atoi(token);
            // get probability
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_FIRE_PROBABILITY] = atoi(token);
            break;
        case AEV_MOVE: // # animID AEV_MOVE framenum forwardpush rightpush uppush
            // get forward push
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_MOVE_FWD] = atoi(token);
            // get right push
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_MOVE_RT] = atoi(token);
            // get upwards push
            token = COM_Parse(text_p);
            if (!token)
            { // WARNING!  BAD TABLE!
                break;
            }
            animEvents[curAnimEvent].eventData[AED_MOVE_UP] = atoi(token);
            break;
        default: // unknown?
            SkipRestOfLine(text_p);
            continue;
            break;
        }

        if (curAnimEvent == lastAnimEvent)
        {
            lastAnimEvent++;
        }
    }
}

#define MAX_TOKEN_CHARS 1024 // max length of an individual token
static char com_token[MAX_TOKEN_CHARS];

char *COM_Parse(const char **data_p)
{
    return COM_ParseExt(data_p, qtrue);
}

static int com_lines;
char *COM_ParseExt(const char **data_p, qboolean allowLineBreaks)
{
    int c = 0, len;
    qboolean hasNewLines = qfalse;
    const char *data;

    data = *data_p;
    len = 0;
    com_token[0] = 0;

    // make sure incoming data is valid
    if (!data)
    {
        *data_p = NULL;
        return com_token;
    }

    while (1)
    {
        // skip whitespace
        data = SkipWhitespace(data, &hasNewLines);
        if (!data)
        {
            *data_p = NULL;
            return com_token;
        }
        if (hasNewLines && !allowLineBreaks)
        {
            *data_p = data;
            return com_token;
        }

        c = *data;

        // skip double slash comments
        if (c == '/' && data[1] == '/')
        {
            data += 2;
            while (*data && *data != '\n')
            {
                data++;
            }
        }
        // skip /* */ comments
        else if (c == '/' && data[1] == '*')
        {
            data += 2;
            while (*data && (*data != '*' || data[1] != '/'))
            {
                data++;
            }
            if (*data)
            {
                data += 2;
            }
        }
        else
        {
            break;
        }
    }

    // handle quoted strings
    if (c == '\"')
    {
        data++;
        while (1)
        {
            c = *data++;
            if (c == '\"' || !c)
            {
                com_token[len] = 0;
                *data_p = (char *)data;
                return com_token;
            }
            if (len < MAX_TOKEN_CHARS)
            {
                com_token[len] = c;
                len++;
            }
        }
    }

    // parse a regular word
    do
    {
        if (len < MAX_TOKEN_CHARS)
        {
            com_token[len] = c;
            len++;
        }
        data++;
        c = *data;
        if (c == '\n')
            com_lines++;
    } while (c > 32);

    if (len == MAX_TOKEN_CHARS)
    {
        //		Com_Printf ("Token exceeded %i chars, discarded.\n", MAX_TOKEN_CHARS);
        len = 0;
    }
    com_token[len] = 0;

    *data_p = (char *)data;
    return com_token;
}

const char *SkipWhitespace(const char *data, qboolean *hasNewLines)
{
    int c;

    while ((c = *data) <= ' ')
    {
        if (!c)
        {
            return NULL;
        }
        if (c == '\n')
        {
            com_lines++;
            *hasNewLines = qtrue;
        }
        data++;
    }

    return data;
}