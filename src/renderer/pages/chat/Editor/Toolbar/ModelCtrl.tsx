import {
  Button,
  Menu,
  MenuCheckedValueChangeData,
  MenuCheckedValueChangeEvent,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
} from '@fluentui/react-components';
import { ChevronDown16Regular } from '@fluentui/react-icons';
import Mousetrap from 'mousetrap';
import { IChat, IChatContext } from 'intellichat/types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useChatStore from 'stores/useChatStore';
import useSettingsStore from 'stores/useSettingsStore';
import { IChatModel, ProviderType } from 'providers/types';
import useAuthStore from 'stores/useAuthStore';
import ToolStatusIndicator from 'renderer/components/ToolStatusIndicator';
import { isUndefined } from 'lodash';
import { getChatModels, getProvider } from 'providers';

export default function ModelCtrl({
  ctx,
  chat,
}: {
  ctx: IChatContext;
  chat: IChat;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const api = useSettingsStore((state) => state.api);
  const modelMapping = useSettingsStore((state) => state.modelMapping);
  const { getToolState } = useSettingsStore();
  const session = useAuthStore((state) => state.session);
  const [providerName, setProviderName] = useState<ProviderType>(api.provider);
  const editStage = useChatStore((state) => state.editStage);

  const models = useMemo<IChatModel[]>(() => {
    if (!api.provider || api.provider === 'Azure') return [];
    const provider = getProvider(api.provider);
    setProviderName(provider.name);
    if (provider.chat.options.modelCustomizable) {
      return getChatModels(provider.name) || [];
    }
    return [];
  }, [api.provider, session]);

  const activeModel = useMemo(() => ctx.getModel(), [chat.model]);

  const closeDialog = () => {
    setOpen(false);
    Mousetrap.unbind('esc');
  };

  const openDialog = () => {
    setOpen(true);
    Mousetrap.bind('esc', closeDialog);
  };

  const toggleDialog = () => {
    if (open) {
      closeDialog();
    } else {
      openDialog();
    }
  };

  const onModelChange = (
    _: MenuCheckedValueChangeEvent,
    data: MenuCheckedValueChangeData,
  ) => {
    const $model = data.checkedItems[0];
    editStage(chat.id, { model: $model });
    window.electron.ingestEvent([{ app: 'switch-model' }, { model: $model }]);
    closeDialog();
  };

  useEffect(() => {
    if (models.length > 0) {
      Mousetrap.bind('mod+shift+1', toggleDialog);
    }
    return () => {
      Mousetrap.unbind('mod+shift+1');
    };
  }, [models]);

  return models && models.length ? (
    <Menu
      hasCheckmarks
      open={open}
      onOpenChange={(_, data) => {
        setOpen(data.open);
      }}
      onCheckedValueChange={onModelChange}
      checkedValues={{ model: [activeModel.label as string] }}
    >
      <MenuTrigger disableButtonEnhancement>
        <Button
          aria-label={t('Common.Model')}
          size="small"
          appearance="subtle"
          iconPosition="after"
          icon={<ChevronDown16Regular />}
          title="Mod+Shift+1"
          style={{ borderColor: 'transparent', boxShadow: 'none', padding: 1 }}
          className="text-color-secondary flex justify-start items-center"
        >
          <div className="flex flex-row justify-start items-center mr-1">
            <ToolStatusIndicator
              provider={providerName}
              model={activeModel.name}
              withTooltip
            />
          </div>
          <div className="flex-shrink overflow-hidden whitespace-nowrap text-ellipsis min-w-12">
            {providerName} /
            {models
              .map((mod: IChatModel) => mod.name)
              .includes(activeModel.name) ? (
              <span>{activeModel.label}</span>
            ) : (
              <span className="text-gray-300 dark:text-gray-600">
                {activeModel.label}
              </span>
            )}
            {modelMapping[activeModel.label || ''] && (
              <span className="text-gray-300 dark:text-gray-600">
                ‣{modelMapping[activeModel.label || '']}
              </span>
            )}
          </div>
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {models.map((item) => {
            let toolEnabled = getToolState(providerName, item.name as string);
            if (isUndefined(toolEnabled)) {
              toolEnabled = item.toolEnabled;
            }
            return (
              <MenuItemRadio
                name="model"
                value={item.name as string}
                key={item.name}
              >
                <div className="flex justify-start items-baseline gap-1">
                  <ToolStatusIndicator
                    provider={providerName}
                    model={item.name}
                  />
                  <span className="latin">{item.label}</span>
                  {modelMapping[item.label || ''] && (
                    <span className="text-gray-300 dark:text-gray-600 -ml-1">
                      ‣{modelMapping[item.label || '']}
                    </span>
                  )}
                </div>
              </MenuItemRadio>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  ) : (
    <Text size={200}>
      <span className="flex justify-start items-center gap-1">
        <div>
          <ToolStatusIndicator
            provider={providerName}
            model={activeModel.name}
          />
        </div>
        <span className="latin">
          {api.provider} / {activeModel.label || activeModel.name}
        </span>
        {modelMapping[activeModel.label || ''] && (
          <span className="text-gray-300 dark:text-gray-600 -ml-1">
            ‣{modelMapping[activeModel.label || '']}
          </span>
        )}
      </span>
    </Text>
  );
}
